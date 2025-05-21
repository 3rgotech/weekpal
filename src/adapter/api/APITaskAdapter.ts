import Task, { WeeklyTask, SomedayTask } from '../../data/task';
import { APIWeekTasklistResponse, ITaskAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

class APITaskAdapter extends APIBaseAdapter implements ITaskAdapter {
    async getWeek(weekCode: string): Promise<APIWeekTasklistResponse> {
        try {
            const response = await this.getClient().get(`data/${weekCode}`).json<{ data: any }>();
            const data = response.data;
            const weeklyTasks: Array<WeeklyTask> = [];
            const somedayTasks: Array<SomedayTask> = [];

            // Convert weekly tasks
            (data.weekly ?? []).forEach((apiTask: any) => {
                const weeklyTask = Task.createFromApiData('weekly', apiTask);
                if (weeklyTask !== null && weeklyTask instanceof WeeklyTask) {
                    weeklyTasks.push(weeklyTask);
                }
            });

            // Convert someday tasks
            (data.someday ?? []).forEach((apiTask: any) => {
                const somedayTask = Task.createFromApiData('someday', apiTask);
                if (somedayTask !== null && somedayTask instanceof SomedayTask) {
                    somedayTasks.push(somedayTask);
                }
            });

            return { weeklyTasks, somedayTasks };
        } catch (error) {
            console.error('Error fetching tasks from API:', error);
            throw error;
        }
    }

    async create(task: Task): Promise<number> {
        try {
            // Get task type from the task instance
            const taskType = task.taskType;

            const payload: Record<string, any> = {
                title: task.title,
                description: task.description,
            };

            // Add specific fields based on task type
            if (taskType === 'weekly' && task instanceof WeeklyTask) {
                payload.week_number = task.weekCode;
                payload.day_of_week = parseInt(task.dayOfWeek, 10);
            } else {
                payload.week_number = 'someday';
            }

            // Add additional fields if they exist
            if (task.categoryId) {
                payload.category_id = task.categoryId;
            }

            if (task.completedAt) {
                payload.completed_at = task.completedAt.toISOString();
            }

            if (task.subtasks) {
                payload.subtasks = JSON.stringify(task.subtasks);
            }

            const response = await this.getClient().post(`task/${taskType}`, {
                json: payload
            }).json<{ id?: number }>();

            return response.id || 0;
        } catch (error) {
            console.error('Error creating task on API:', error);
            throw error;
        }
    }

    async update(task: Task): Promise<void> {
        try {
            if (!task.serverId) {
                console.error('Cannot update task without a server ID');
                return;
            }

            // Get task type from the task instance
            const taskType = task.taskType;

            const payload: Record<string, any> = {
                title: task.title,
                description: task.description,
            };

            // Add category if present
            if (task.categoryId) {
                payload.category_id = task.categoryId;
            }

            // Handle completed status
            if (task.completedAt) {
                payload.completed_at = task.completedAt.toISOString();
            }

            // Add subtasks if present
            if (task.subtasks) {
                payload.subtasks = JSON.stringify(task.subtasks);
            }

            await this.getClient().put(`task/${taskType}/${task.serverId}`, {
                json: payload
            });
        } catch (error) {
            console.error('Error updating task on API:', error);
            throw error;
        }
    }

    async delete(task: Task): Promise<void> {
        try {
            if (!task.serverId) {
                console.error('Cannot delete task without a server ID');
                return;
            }

            // Get task type from the task instance
            const taskType = task.taskType;

            await this.getClient().delete(`task/${taskType}/${task.serverId}`);
        } catch (error) {
            console.error('Error deleting task from API:', error);
            throw error;
        }
    }
}

export default APITaskAdapter;