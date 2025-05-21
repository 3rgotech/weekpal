import Task, { WeeklyTask, SomedayTask } from '../../data/task';
import { APIWeekTasklistResponse, ITaskAdapter } from '../../types';

class TestTaskAdapter implements ITaskAdapter {
    constructor() {
        console.log('[TestTaskAdapter] Initialized');
    }

    async getWeek(weekCode: string): Promise<APIWeekTasklistResponse> {
        console.log(`[TestTaskAdapter] Getting tasks for week: ${weekCode}`);

        // Return empty arrays for testing
        return {
            weeklyTasks: [],
            somedayTasks: []
        };
    }

    async create(task: Task): Promise<number> {
        console.log('[TestTaskAdapter] Creating task:', {
            title: task.title,
            description: task.description,
            type: task.taskType
        });

        // Return a mock server ID
        return Math.floor(Math.random() * 10000);
    }

    async update(task: Task): Promise<void> {
        console.log('[TestTaskAdapter] Updating task:', {
            id: task.serverId,
            title: task.title,
            description: task.description,
            type: task.taskType
        });
    }

    async delete(task: Task): Promise<void> {
        console.log('[TestTaskAdapter] Deleting task:', {
            id: task.serverId,
            title: task.title,
            type: task.taskType
        });
    }
}

export default TestTaskAdapter;