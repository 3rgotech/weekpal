import Task, { WeeklyTask, SomedayTask } from '../../data/task';
import Event from '../../data/event';
import { ITaskAdapter, LeftoverPayload, WeekPayload } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * Talks to the Laravel backend.
 *
 * Every response is wrapped in `{ data: ... }` — the old API wrapped some endpoints and
 * returned bare resources from others, and this adapter encoded that inconsistency.
 *
 * Paths carry no leading slash. `ky` 2's `prefix` tolerates one, unlike the `prefixUrl` it
 * replaced, but the whole adapter is written without them and mixing the two styles would only
 * invite the question of which is right.
 */
class APITaskAdapter extends APIBaseAdapter implements ITaskAdapter {
    async getWeek(weekCode: string): Promise<WeekPayload> {
        const response = await this.getClient()
            .get(`weeks/${weekCode}`)
            .json<{ data: { tasks: any[]; events: any[] } }>();

        const tasks = (response.data?.tasks ?? [])
            .map((row) => Task.createFromApiData(row))
            .filter((task): task is WeeklyTask | SomedayTask => task !== null);

        // Mapped, not constructed directly: the API sends snake_case keys, and the
        // Event constructor reads camelCase ones.
        const events = (response.data?.events ?? [])
            .map((row) => Event.createFromApiData(row))
            .filter((event): event is Event => event !== null);

        return { tasks, events };
    }

    /**
     * Everything still outstanding from weeks that have ended.
     *
     * Not derivable from the week endpoint: the client only ever holds the weeks it has
     * browsed, so a task abandoned in a week nobody has opened since is invisible to it. The
     * server answers with the whole window at once, and says where the window starts.
     */
    async leftovers(): Promise<LeftoverPayload> {
        const response = await this.getClient()
            .get('tasks/leftovers')
            .json<{ data: any[]; meta?: { since?: string } }>();

        const tasks = (response.data ?? [])
            .map((row) => Task.createFromApiData(row))
            .filter((task): task is WeeklyTask | SomedayTask => task !== null);

        return { tasks, since: response.meta?.since ?? '' };
    }

    /**
     * Create or update — the server decides which, keyed by the id the client minted.
     *
     * The stored row comes back and is written to IndexedDB by the caller, which is what makes
     * last-writer-wins actually converge. The old `update()` returned void, so the server's
     * version of the row was discarded and the two copies could drift apart unnoticed.
     */
    async upsert(task: Task): Promise<Task> {
        const response = await this.getClient()
            .put(`tasks/${task.id}`, { json: task.toApiPayload() })
            .json<{ data: any }>();

        return this.parseOrThrow(response.data, task.id);
    }

    async upsertMany(tasks: Task[]): Promise<Task[]> {
        if (tasks.length === 0) {
            return [];
        }

        const response = await this.getClient()
            .put('tasks', { json: { tasks: tasks.map((task) => task.toApiPayload()) } })
            .json<{ data: any[] }>();

        return (response.data ?? [])
            .map((row) => Task.createFromApiData(row))
            .filter((task): task is WeeklyTask | SomedayTask => task !== null);
    }

    /** Idempotent: the backend answers 204 whether or not the task was still there. */
    async delete(id: string): Promise<void> {
        await this.getClient().delete(`tasks/${id}`);
    }

    private parseOrThrow(row: any, id: string): Task {
        const task = Task.createFromApiData(row);

        if (task === null) {
            throw new Error(`The API returned an unreadable task for ${id}.`);
        }

        return task;
    }
}

export default APITaskAdapter;
