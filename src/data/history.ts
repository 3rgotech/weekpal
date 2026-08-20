import { Dayjs } from "dayjs";
import Base from "./base";

/** The events the backend records; see App\Actions\WeekPal\RecordTaskHistory. */
export type HistoryEvent =
    | 'created'
    | 'updated'
    | 'moved'
    | 'completed'
    | 'uncompleted'
    | 'deleted'
    | 'restored';

/** `{ field: { from, to } }` — absent for events with nothing to diff. */
export interface HistoryChanges {
    [field: string]: { from: unknown; to: unknown };
}

/**
 * One entry in a task's changelog.
 *
 * Unlike every other record in this application, history is server-derived and read-only: there
 * is no client-minted id, no write path and nothing to queue. It is fetched when asked for and
 * never persisted locally — caching a changelog that only the server can extend would just be a
 * copy that goes stale.
 */
class HistoryEntry extends Base {
    public taskId: string;
    public event: HistoryEvent;
    public changes: HistoryChanges | null;
    public createdAt: Dayjs | null;

    constructor(data: Record<string, any>) {
        super(data);
        this.taskId = data.taskId;
        this.event = data.event;
        this.changes = data.changes ?? null;
        this.createdAt = this.parseDate(data.createdAt);
    }

    /** The fields this entry touched, for rendering a diff. */
    changedFields(): string[] {
        return Object.keys(this.changes ?? {});
    }

    static createFromApiData(data: Record<string, any>): HistoryEntry {
        return new HistoryEntry({
            id: data.id,
            taskId: data.task_id,
            event: data.event,
            changes: data.changes ?? null,
            createdAt: data.created_at ?? null,
        });
    }
}

export default HistoryEntry;
