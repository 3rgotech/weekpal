class BaseStore {

    protected adapter: object | null;

    constructor(adapter?: object) {
        this.adapter = adapter ?? null;
    }

    canSync(): boolean {
        return this.adapter !== null;
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

}

export default BaseStore;