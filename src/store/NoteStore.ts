import Note from "../data/note";
import { INoteAdapter, INoteStore } from "../types";
import BaseStore from "./BaseStore";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure, reportSyncHealth } from "../utils/syncStatus";

class NoteStore extends BaseStore implements INoteStore {

    private adapter: INoteAdapter | null;

    constructor(adapter?: INoteAdapter | null) {
        super('note', adapter);
        this.adapter = adapter ?? null;
    }

    /**
     * Notes for one task, oldest first — they read as a thread.
     *
     * This pulls on every call rather than going through `shouldSync`'s five-minute throttle.
     * That throttle exists for the whole-table pulls that run on a timer; this fires only when
     * someone opens a task, which is both rare and deliberate, and one task's notes are a few
     * rows. Showing a stale note to somebody who just asked to see it would be the worse trade.
     */
    async list(taskId: string): Promise<Note[]> {
        if (this.canSync('note')) {
            await this.pull(taskId);
        }

        return this.db.taskNotes.where('taskId').equals(taskId).sortBy('createdAt');
    }

    /**
     * Full-set reconcile, scoped to one task: the server's list is the complete set of notes on
     * it, so a local note missing from the response was deleted elsewhere. Rows with a queued
     * write are left alone — they are the ones the server has not heard about yet.
     */
    private async pull(taskId: string): Promise<void> {
        if (!this.adapter) {
            return;
        }

        try {
            const notes = await this.adapter.list(taskId);
            const pending = await this.syncService.pendingEntityIds('note');

            const incoming = notes.filter((note) => !pending.has(note.id));
            const returnedIds = new Set(notes.map((note) => note.id));

            const stale = (await this.db.taskNotes.where('taskId').equals(taskId).toArray())
                .filter((note) => !returnedIds.has(note.id) && !pending.has(note.id))
                .map((note) => note.id);

            await this.db.transaction('rw', this.db.taskNotes, async () => {
                await this.db.taskNotes.bulkDelete(stale);
                if (incoming.length > 0) {
                    await this.db.taskNotes.bulkPut(incoming);
                }
            });

            reportSyncHealth('ok');
        } catch (error) {
            // A failed pull is not a failed read: the local notes are still shown.
            reportSyncFailure(classifyFailure(error));
            console.error(`Could not pull notes for task ${taskId}:`, error);
        }
    }

    async reload(note: string | Note): Promise<Note | null> {
        const noteId = typeof note === 'string' ? note : note.id;
        if (!noteId) {
            return null;
        }

        return (await this.db.taskNotes.get(noteId)) ?? null;
    }

    private async put(note: Note): Promise<Note> {
        await this.db.taskNotes.put(note);

        await this.syncService.enqueue({
            entityType: 'note',
            entityId: note.id,
            type: 'upsert',
            // The note's own row carries this too, but a queue entry has to stand on its own —
            // see the delete below, which is replayed after the local row is gone.
            data: { taskId: note.taskId },
        });

        return (await this.reload(note)) ?? note;
    }

    async create(note: Note): Promise<Note> {
        return this.put(note);
    }

    async update(note: Note): Promise<Note> {
        note.updatedAt = note.parseDate(new Date().toISOString());

        return this.put(note);
    }

    async delete(note: Note): Promise<void> {
        await this.db.taskNotes.delete(note.id);

        await this.syncService.enqueue({
            entityType: 'note',
            entityId: note.id,
            type: 'delete',
            // Snapshotted because the route is nested: by the time this is sent the local row is
            // gone, and without the task id there is no URL to send it to.
            data: { taskId: note.taskId },
        });
    }
}

export default NoteStore;
