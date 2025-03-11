import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";

class Base {
    public id: number | undefined;
    public serverId: number | undefined;

    constructor(data: Record<string, any>) {
        this.id = data.id ?? undefined;
        this.serverId = data.serverId ?? undefined;
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