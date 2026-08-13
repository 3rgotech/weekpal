import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";
import { newId } from "../utils/id";

class Base {
    /**
     * The one and only identifier, minted here rather than assigned by a backend.
     *
     * There is deliberately no `serverId` beside it: the id in IndexedDB, in Laravel and in
     * Postgres are the same string, which is what lets a write be retried safely.
     */
    public id: string;

    constructor(data: Record<string, any>) {
        this.id = data.id ?? newId();
    }

    parseDate(date: string | Dayjs | null): Dayjs | null {
        const dayjs = getDayJs();
        if (typeof date === 'object' && date !== null && '$d' in date) {
            return dayjs(date.$d as Date);
        }
        if (typeof date === 'string') {
            return dayjs(date);
        }
        return null;
    }
}

export default Base;
