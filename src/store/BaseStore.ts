import SyncService from "../utils/SyncService";
import { WeekpalDB } from "./db";

class BaseStore {

    protected adapter: any | null;
    protected syncService: SyncService | null = null;
    protected db: WeekpalDB;

    constructor(adapter?: any) {
        this.adapter = adapter ?? null;
        this.db = new WeekpalDB();

        // Create the SyncService instance if we have an adapter
        if (this.adapter !== null) {
            this.syncService = new SyncService(this.db, this.adapter);
        }
    }

    canSync(): boolean {
        return this.adapter !== null && navigator.onLine;
    }

    shouldSync(table: string): boolean {
        if (!this.canSync()) {
            return false;
        }
        const lastSyncTimestamp = localStorage.getItem(`${table}-last-sync`);
        const elapsed = Date.now() - parseInt(lastSyncTimestamp ?? '0', 10);
        return elapsed > 1000 * 60 * 5;
    }

    setLastSync(table: string) {
        localStorage.setItem(`${table}-last-sync`, Date.now().toString());
    }

    // Force synchronization of all pending changes
    async syncPendingChanges(): Promise<void> {
        if (this.syncService) {
            await this.syncService.syncPendingChanges();
        }
    }

    // Get the number of pending changes
    getPendingChangesCount(): number {
        return this.syncService ? this.syncService.getPendingChangesCount() : 0;
    }
}

export default BaseStore;