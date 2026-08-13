import Project from '../../data/project';
import Task, { WeeklyTask, SomedayTask } from '../../data/task';
import { IProjectAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * Projects — the custom lists.
 *
 * No UI consumes this yet. It exists because the endpoints and the schema shipped together, and
 * an adapter written alongside them is one written against a contract that is still fresh.
 */
class APIProjectAdapter extends APIBaseAdapter implements IProjectAdapter {
    async list(): Promise<Project[]> {
        const response = await this.getClient().get('projects').json<{ data: any[] }>();

        return (response.data ?? [])
            .map((row) => Project.createFromApiData(row))
            .filter((project): project is Project => project !== null);
    }

    async upsert(project: Project): Promise<Project> {
        const response = await this.getClient()
            .put(`projects/${project.id}`, { json: project.toApiPayload() })
            .json<{ data: any }>();

        const stored = Project.createFromApiData(response.data);

        if (stored === null) {
            throw new Error(`The API returned an unreadable project for ${project.id}.`);
        }

        return stored;
    }

    async delete(id: string): Promise<void> {
        await this.getClient().delete(`projects/${id}`);
    }

    /**
     * A project's unscheduled tasks.
     *
     * These are deliberately absent from the week payload — a long backlog would otherwise be
     * refetched with every week — so they load here instead.
     */
    async backlog(projectId: string): Promise<Task[]> {
        const response = await this.getClient()
            .get(`projects/${projectId}/tasks`)
            .json<{ data: any[] }>();

        return (response.data ?? [])
            .map((row) => Task.createFromApiData(row))
            .filter((task): task is WeeklyTask | SomedayTask => task !== null);
    }
}

export default APIProjectAdapter;
