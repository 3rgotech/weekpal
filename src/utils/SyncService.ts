import { WeekpalDB } from "../store/db";
import Task, { WeeklyTask, SomedayTask } from "../data/task";
import Category from "../data/category";
import Event from "../data/event";
import { ITaskAdapter, ICategoryAdapter, IEventAdapter } from "../types";

interface PendingChange {
    id: number;
    type: 'create' | 'update' | 'delete';
    entityType: 'task' | 'category' | 'event';
    data?: any;
    timestamp: number;
}

export class SyncService {
    private db: WeekpalDB;
    private taskAdapter: ITaskAdapter | null;
    private categoryAdapter: ICategoryAdapter | null;
    private eventAdapter: IEventAdapter | null;
    private isOnline: boolean;
    private pendingChanges: PendingChange[];
    private isSyncing: boolean = false;

    constructor(
        db: WeekpalDB,
        taskAdapter: ITaskAdapter | null = null,
        categoryAdapter: ICategoryAdapter | null = null,
        eventAdapter: IEventAdapter | null = null
    ) {
        this.db = db;
        this.taskAdapter = taskAdapter;
        this.categoryAdapter = categoryAdapter;
        this.eventAdapter = eventAdapter;
        this.isOnline = navigator.onLine;
        this.pendingChanges = this.loadPendingChanges();

        // Listen for online/offline events
        window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
        window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    }

    private handleOnlineStatusChange() {
        const wasOnline = this.isOnline;
        this.isOnline = navigator.onLine;

        // If we just came online, attempt to sync pending changes
        if (!wasOnline && this.isOnline) {
            this.syncPendingChanges();
        }
    }

    private loadPendingChanges(): PendingChange[] {
        const storedChanges = localStorage.getItem('pendingChanges');
        return storedChanges ? JSON.parse(storedChanges) : [];
    }

    private savePendingChanges() {
        localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    }

    addPendingChange(change: Omit<PendingChange, 'timestamp'>) {
        this.pendingChanges.push({
            ...change,
            timestamp: Date.now()
        });
        this.savePendingChanges();

        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncPendingChanges();
        }
    }

    async syncPendingChanges() {
        if (!this.isOnline || this.isSyncing || this.pendingChanges.length === 0) {
            return;
        }

        this.isSyncing = true;

        try {
            // Process pending changes in order of creation (oldest first)
            const sortedChanges = [...this.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);

            for (let i = 0; i < sortedChanges.length; i++) {
                const change = sortedChanges[i];

                try {
                    await this.processChange(change);
                    // Remove the change after successful processing
                    this.pendingChanges = this.pendingChanges.filter(c =>
                        !(c.id === change.id && c.type === change.type && c.entityType === change.entityType)
                    );
                    this.savePendingChanges();
                } catch (error) {
                    console.error(`Error processing change: ${change.id}, ${change.type}, ${change.entityType}`, error);
                    // If a change fails, we'll try again later
                    break;
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private async processChange(change: PendingChange) {
        const { id, type, entityType, data } = change;

        if (entityType === 'task') {
            if (!this.taskAdapter) return;

            if (type === 'create') {
                const weeklyTask = await this.db.weeklyTasks.get(id);
                const somedayTask = await this.db.somedayTasks.get(id);
                const task = weeklyTask || somedayTask;

                if (!task) return;

                const serverId = await this.taskAdapter.create(task);
                task.serverId = serverId;

                // Update the local record with the server ID
                if (task instanceof WeeklyTask) {
                    await this.db.weeklyTasks.put(task);
                } else if (task instanceof SomedayTask) {
                    await this.db.somedayTasks.put(task);
                }
            }
            else if (type === 'update') {
                const weeklyTask = await this.db.weeklyTasks.get(id);
                const somedayTask = await this.db.somedayTasks.get(id);
                const task = weeklyTask || somedayTask;

                if (!task || !task.serverId) return;

                await this.taskAdapter.update(task);
            }
            else if (type === 'delete') {
                // For deletes, the original task might be gone from the DB
                // so we use the stored data
                if (!data || !data.serverId) return;

                const mockTask = { serverId: data.serverId, taskType: data.taskType } as Task;
                await this.taskAdapter.delete(mockTask);
            }
        }
        else if (entityType === 'category') {
            if (!this.categoryAdapter) return;

            if (type === 'create') {
                const category = await this.db.categories.get(id);
                if (!category) return;

                const serverId = await this.categoryAdapter.create(category);
                category.serverId = serverId;
                await this.db.categories.put(category);
            }
            else if (type === 'update') {
                const category = await this.db.categories.get(id);
                if (!category || !category.serverId) return;

                await this.categoryAdapter.update(category);
            }
            else if (type === 'delete') {
                if (!data || !data.serverId) return;

                await this.categoryAdapter.delete({ serverId: data.serverId } as Category);
            }
        }
        // Similar logic for events if needed
    }

    isEntityPendingSync(entityType: string, id: number): boolean {
        return this.pendingChanges.some(change =>
            change.entityType === entityType && change.id === id
        );
    }

    getPendingChangesCount(): number {
        return this.pendingChanges.length;
    }
}

export default SyncService;