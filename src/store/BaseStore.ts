import SyncService from "../utils/SyncService";
import { ICategoryAdapter, IProjectAdapter, ITaskAdapter } from "../types";
import { WeekpalDB } from "./db";

interface AdapterRegistry {
    task?: ITaskAdapter | null;
    category?: ICategoryAdapter | null;
    project?: IProjectAdapter | null;
}

class BaseStore {

    /**
     * One database connection for the whole application.
     *
     * Each store used to call `new WeekpalDB()`, so a single `DataProvider` opened three
     * connections — four, because `EventStore` redeclared its own `db` and opened another. They
     * were never closed, and `DataContext` rebuilds its stores whenever the adapters change.
     */
    private static database: WeekpalDB | null = null;

    /**
     * Adapters registered by the stores as they are constructed.
     *
     * The queue is shared, so it needs every adapter — but no single store knows about the
     * others. Previously `BaseStore` passed whatever adapter it had into the *first* constructor
     * slot, which is the task slot: in `CategoryStore` the category adapter landed on
     * `taskAdapter` and `categoryAdapter` stayed null, and `processChange` bailed out on every
     * queued category write. Registering by name removes the positional bug entirely.
     */
    private static adapters: AdapterRegistry = {};

    protected db: WeekpalDB;
    protected syncService: SyncService;

    /**
     * @param kind which adapter slot this store fills, or null for a store that never writes
     *             (events are read-only in v1, so they have nothing to queue)
     */
    constructor(kind: keyof AdapterRegistry | null, adapter?: ITaskAdapter | ICategoryAdapter | IProjectAdapter | null) {
        BaseStore.database ??= new WeekpalDB();
        this.db = BaseStore.database;

        if (kind !== null) {
            BaseStore.adapters = { ...BaseStore.adapters, [kind]: adapter ?? null };
        }

        this.syncService = SyncService.shared(this.db, BaseStore.adapters);
    }

    /** Test seam: forget the shared connection, queue and adapters. */
    static resetShared(): void {
        SyncService.reset();
        BaseStore.database = null;
        BaseStore.adapters = {};
    }

    protected hasAdapter(kind: keyof AdapterRegistry): boolean {
        return BaseStore.adapters[kind] != null;
    }

    canSync(kind: keyof AdapterRegistry): boolean {
        return this.hasAdapter(kind) && navigator.onLine;
    }

    shouldSync(table: string, kind: keyof AdapterRegistry): boolean {
        return this.canSync(kind) && this.throttleElapsed(table);
    }

    /** At most one pull per table every five minutes. */
    protected throttleElapsed(table: string): boolean {
        const lastSyncTimestamp = localStorage.getItem(`${table}-last-sync`);
        const elapsed = Date.now() - parseInt(lastSyncTimestamp ?? '0', 10);
        return elapsed > 1000 * 60 * 5;
    }

    setLastSync(table: string) {
        localStorage.setItem(`${table}-last-sync`, Date.now().toString());
    }

    async syncPendingChanges(): Promise<void> {
        await this.syncService.syncPendingChanges();
    }

    async getPendingChangesCount(): Promise<number> {
        return this.syncService.getPendingChangesCount();
    }
}

export default BaseStore;
