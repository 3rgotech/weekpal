import Task from '../../data/task';
import { ITaskAdapter, WeekPayload } from '../../types';

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

    async upsert(task: Task): Promise<Task> {
        return task;
    }

    async upsertMany(tasks: Task[]): Promise<Task[]> {
        return tasks;
    }

    async delete(_id: string): Promise<void> {
        // Nothing to do — the fixtures live in IndexedDB.
    }
}

export default TestTaskAdapter;
