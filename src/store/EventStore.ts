import Event from "../data/event";
import { IEventAdapter, IEventStore } from "../types";
import BaseStore from "./BaseStore";
import { WeekpalDB } from "./db";


class EventStore extends BaseStore implements IEventStore {

    declare protected adapter: IEventAdapter | null;
    private db: WeekpalDB;

    constructor(adapter?: IEventAdapter) {
        super(adapter);
        this.db = new WeekpalDB();
    }

    async list(weekCode: string): Promise<Event[]> {
        if (this.shouldSync('events') && navigator.onLine) {
            try {
                const adapterEvents = await this.adapter?.getWeek(weekCode);
                if (adapterEvents) {
                    await this.db.events.bulkPut(adapterEvents);
                    this.setLastSync('events');
                }
            } catch (error) {
                console.error("Error getting events for week " + weekCode + " : ", error);
            }
        }

        const events = await this.db.events
            .where('weekCode').equals(weekCode)
            .toArray();
        return events.map((event) => new Event(event));
    }

    async reload(event: number | Event): Promise<Event | null> {
        const eventId = typeof event === 'number' ? event : event.id;
        if (!eventId) {
            return null;
        }
        const reloadedEvent = await this.db.events.get(eventId);
        return reloadedEvent ?? null;
    }
}

export default EventStore;