import Task, { WeeklyTask, SomedayTask } from '../../data/task';
import Event from '../../data/event';
import { ITaskAdapter, LeftoverPayload, TaskWriteResult, WeekPayload, WriteIntent } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';
import { recordServerTime } from '../../utils/syncClock';

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
     * The whole representation goes up, but `dirty` is what the server treats as a *claim*.
     * Everything outside it is this client reporting what it last saw, which is what makes the
     * payload self-healing without letting a stale tab overwrite work it never knew about.
     *
     * The answer is a result, not a row: "some of what you sent did not land" is the only
     * interesting outcome and a bare row cannot express it.
     */
    async upsert(task: Task, intent?: WriteIntent): Promise<TaskWriteResult> {
        const response = await this.getClient()
            .put(`tasks/${task.id}`, {
                json: {
                    ...task.toApiPayload(),
                    dirty: intent?.dirty?.[task.id] ?? {},
                    ...this.envelope(intent),
                },
            })
            .json<{ data: TaskWriteResult; meta?: { server_time?: string } }>();

        recordServerTime(response.meta?.server_time);

        return response.data;
    }

    async upsertMany(tasks: Task[], intent?: WriteIntent): Promise<TaskWriteResult[]> {
        if (tasks.length === 0) {
            return [];
        }

        const response = await this.getClient()
            .put('tasks', {
                json: {
                    tasks: tasks.map((task) => ({
                        ...task.toApiPayload(),
                        // Per row: a reorder touches a dozen tasks and each one's claim is about
                        // its own position at its own moment.
                        dirty: intent?.dirty?.[task.id] ?? {},
                    })),
                    ...this.envelope(intent),
                },
            })
            .json<{ data: TaskWriteResult[]; meta?: { server_time?: string } }>();

        recordServerTime(response.meta?.server_time);

        return response.data ?? [];
    }

    /** Idempotent: the backend answers 204 whether or not the task was still there. */
    async delete(id: string): Promise<void> {
        await this.getClient().delete(`tasks/${id}`);
    }

    /**
     * The parts that describe the gesture rather than any one row.
     *
     * Keys are omitted rather than sent as null: the server treats a missing `mutation_id` as
     * "do not dedupe this", which is the correct reading of a client that has none.
     */
    private envelope(intent?: WriteIntent): Record<string, string> {
        return {
            ...(intent?.mutationId ? { mutation_id: intent.mutationId } : {}),
            ...(intent?.deviceId ? { device_id: intent.deviceId } : {}),
        };
    }
}

export default APITaskAdapter;
