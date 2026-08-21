import Event from "../data/event";
import { IEventAdapter, IEventStore } from "../types";
import BaseStore from "./BaseStore";
import { isReachable } from "../utils/connectivity";

/**
 * Calendar events, which are read-only in v1.
 *
 * Nothing implements `IEventAdapter` yet — events come from calendar sync, which is not built —
 * so in practice this reads the fixtures seeded into IndexedDB. It registers no adapter with the
 * write queue because it never writes.
 */
class EventStore extends BaseStore implements IEventStore {

    private adapter: IEventAdapter | null;

    constructor(adapter?: IEventAdapter | null) {
        // This store previously opened its own `new WeekpalDB()` on top of the one it inherited,
        // giving a single DataProvider four connections rather than one.
        super(null);
        this.adapter = adapter ?? null;
    }

    async list(weekCode: string): Promise<Event[]> {
        if (this.adapter && isReachable() && this.throttleElapsed('events')) {
            try {
                const events = await this.adapter.getWeek(weekCode);
                await this.db.events.bulkPut(events);
                this.setLastSync('events');
            } catch (error) {
                console.error(`Could not pull events for week ${weekCode}:`, error);
            }
        }

        return this.db.events.where('weekCode').equals(weekCode).toArray();
    }

    async reload(event: string | Event): Promise<Event | null> {
        const eventId = typeof event === 'string' ? event : event.id;
        if (!eventId) {
            return null;
        }

        return (await this.db.events.get(eventId)) ?? null;
    }
}

export default EventStore;
