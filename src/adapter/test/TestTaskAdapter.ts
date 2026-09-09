import Task from '../../data/task';
import { ITaskAdapter, LeftoverPayload, TaskWriteResult, WeekPayload } from '../../types';

/**
 * A no-op backend for `VITE_DATA_SOURCE=test`.
 *
 * Writes echo the task straight back, which is what a real upsert does: the client already
 * knows the id, so there is nothing for the server to assign.
 */
class TestTaskAdapter implements ITaskAdapter {
    async getWeek(_weekCode: string): Promise<WeekPayload> {
        return { tasks: [], events: [] };
    }

    async leftovers(): Promise<LeftoverPayload> {
        // An empty window rather than an empty list: `since: ''` tells the store there is no
        // server-side scope to reconcile against, so it keeps whatever the fixtures hold.
        return { tasks: [], since: '' };
    }

    async upsert(task: Task): Promise<TaskWriteResult> {
        return TestTaskAdapter.accepted(task);
    }

    async upsertMany(tasks: Task[]): Promise<TaskWriteResult[]> {
        return tasks.map((task) => TestTaskAdapter.accepted(task));
    }

    /**
     * Everything is applied, and nothing is ever superseded.
     *
     * There is no second writer in a test board, so there is nothing to lose to — which makes
     * this the honest answer rather than a convenient one.
     */
    private static accepted(task: Task): TaskWriteResult {
        return { id: task.id, status: 'applied', task: task.toApiPayload() };
    }

    async delete(_id: string, _reason?: string): Promise<void> {
        // Nothing to do — the fixtures live in IndexedDB.
    }
}

export default TestTaskAdapter;
