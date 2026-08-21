import Project from "../data/project";
import Task, { SomedayTask } from "../data/task";
import { IProjectAdapter, IProjectStore } from "../types";
import BaseStore from "./BaseStore";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure, reportSyncHealth } from "../utils/syncStatus";

class ProjectStore extends BaseStore implements IProjectStore {

    private adapter: IProjectAdapter | null;

    constructor(adapter?: IProjectAdapter | null) {
        super('project', adapter);
        this.adapter = adapter ?? null;
    }

    async list(): Promise<Project[]> {
        if (this.shouldSync('projects', 'project')) {
            await this.pull();
        }

        return this.db.projects.orderBy('name').toArray();
    }

    /** Full-set reconcile, as for categories: the server's list is the complete live set. */
    private async pull(): Promise<void> {
        if (!this.adapter) {
            return;
        }

        try {
            const projects = await this.adapter.list();
            const pending = await this.syncService.pendingEntityIds('project');

            const incoming = projects.filter((project) => !pending.has(project.id));
            const returnedIds = new Set(projects.map((project) => project.id));

            const stale = (await this.db.projects.toArray())
                .filter((project) => !returnedIds.has(project.id) && !pending.has(project.id))
                .map((project) => project.id);

            await this.db.transaction('rw', this.db.projects, async () => {
                await this.db.projects.bulkDelete(stale);
                if (incoming.length > 0) {
                    await this.db.projects.bulkPut(incoming);
                }
            });

            this.setLastSync('projects');
            reportSyncHealth('ok');
        } catch (error) {
            reportSyncFailure(classifyFailure(error));
            console.error("Could not pull projects:", error);
        }
    }

    /**
     * A project's unscheduled tasks.
     *
     * They are stored in `somedayTasks` like any other task without a week, and told apart by
     * `projectId`. The week payload deliberately leaves them out, so this is the only path that
     * brings them down — and `TaskStore`'s reconcile is written to leave them alone.
     */
    async backlog(projectId: string): Promise<Task[]> {
        if (this.canSync('project') && this.adapter) {
            try {
                const tasks = await this.adapter.backlog(projectId);
                const pending = await this.syncService.pendingEntityIds('task');
                const incoming = tasks.filter((task) => !pending.has(task.id));
                const returnedIds = new Set(tasks.map((task) => task.id));

                const stale = (await this.db.somedayTasks.toArray())
                    .filter((task) => task.projectId === projectId
                        && !returnedIds.has(task.id)
                        && !pending.has(task.id))
                    .map((task) => task.id);

                await this.db.transaction('rw', this.db.somedayTasks, async () => {
                    await this.db.somedayTasks.bulkDelete(stale);
                    if (incoming.length > 0) {
                        await this.db.somedayTasks.bulkPut(incoming as SomedayTask[]);
                    }
                });

                reportSyncHealth('ok');
            } catch (error) {
                // A failed pull still shows whatever is cached.
                reportSyncFailure(classifyFailure(error));
                console.error(`Could not pull the backlog for project ${projectId}:`, error);
            }
        }

        return (await this.db.somedayTasks.toArray())
            .filter((task) => task.projectId === projectId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    async reload(project: string | Project): Promise<Project | null> {
        const projectId = typeof project === 'string' ? project : project.id;
        if (!projectId) {
            return null;
        }

        return (await this.db.projects.get(projectId)) ?? null;
    }

    private async put(project: Project): Promise<Project> {
        await this.db.projects.put(project);

        await this.syncService.enqueue({
            entityType: 'project',
            entityId: project.id,
            type: 'upsert',
        });

        return (await this.reload(project)) ?? project;
    }

    async create(project: Project): Promise<Project> {
        return this.put(project);
    }

    async update(project: Project): Promise<Project> {
        return this.put(project);
    }

    /**
     * Deleting a project does not delete its tasks.
     *
     * The backend nulls their `project_id` (nullOnDelete), so a backlog becomes ordinary someday
     * tasks rather than vanishing with the list. The local rows are updated to match instead of
     * being removed, so the board does not have to wait for a pull to show them again.
     */
    async delete(project: Project): Promise<void> {
        const orphaned = (await this.db.somedayTasks.toArray())
            .filter((task) => task.projectId === project.id);

        await this.db.transaction('rw', this.db.projects, this.db.somedayTasks, async () => {
            await this.db.projects.delete(project.id);

            for (const task of orphaned) {
                task.projectId = null;
                await this.db.somedayTasks.put(task);
            }
        });

        await this.syncService.enqueue({
            entityType: 'project',
            entityId: project.id,
            type: 'delete',
        });
    }
}

export default ProjectStore;
