import { Dayjs } from "dayjs";
import Base from "./base";
import { getDayJs } from "../utils/dayjs";

/**
 * A note a user wrote against a task.
 *
 * Notes are user-authored content, so they follow the same offline path as tasks and
 * categories: minted with a client id, written to IndexedDB first, queued for the API. Typing a
 * note on a train has to work.
 */
class Note extends Base {
    public taskId: string;
    public body: string;
    public createdAt: Dayjs | null;
    public updatedAt: Dayjs | null;

    constructor(data: Record<string, any>) {
        super(data);
        const dayjs = getDayJs();

        this.taskId = data.taskId;
        this.body = data.body ?? '';
        this.createdAt = data.createdAt ? this.parseDate(data.createdAt) : dayjs();
        this.updatedAt = this.parseDate(data.updatedAt);
    }

    /** Plain object for IndexedDB — Dexie cannot store a Dayjs. */
    serialize(): Record<string, any> {
        return {
            id: this.id,
            taskId: this.taskId,
            body: this.body,
            createdAt: this.createdAt?.toISOString() ?? null,
            updatedAt: this.updatedAt?.toISOString() ?? null,
        };
    }

    /** The API's snake_case shape. Only `body` is writable; the rest is server-owned. */
    toApiData(): Record<string, any> {
        return {
            body: this.body,
        };
    }

    static createFromApiData(data: Record<string, any>): Note {
        return new Note({
            id: data.id,
            taskId: data.task_id,
            body: data.body,
            createdAt: data.created_at ?? null,
            updatedAt: data.updated_at ?? null,
        });
    }
}

export default Note;
