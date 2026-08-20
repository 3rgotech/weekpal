import Note from '../../data/note';
import { INoteAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

class APITaskNoteAdapter extends APIBaseAdapter implements INoteAdapter {
    async list(taskId: string): Promise<Note[]> {
        const response = await this.getClient()
            .get(`tasks/${taskId}/notes`)
            .json<{ data: any[] }>();

        return (response.data ?? []).map(Note.createFromApiData);
    }

    /**
     * PUT with the client's own id, like every other write — a note composed offline replays
     * safely, and a retry after a timeout updates the same row instead of adding a second one.
     */
    async upsert(note: Note): Promise<Note> {
        const response = await this.getClient()
            .put(`tasks/${note.taskId}/notes/${note.id}`, { json: note.toApiData() })
            .json<{ data: any }>();

        return Note.createFromApiData(response.data);
    }

    async delete(taskId: string, id: string): Promise<void> {
        await this.getClient().delete(`tasks/${taskId}/notes/${id}`);
    }
}

export default APITaskNoteAdapter;
