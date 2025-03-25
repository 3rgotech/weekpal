import { Dayjs } from "dayjs";
import Base from "./base";
import { DayOfWeek } from "../types";

class Event extends Base {
    public title: string;

    public weekCode: string | null;
    public dayOfWeek: DayOfWeek | null;

    public startHour: string | null;
    public endHour: string | null;

    public categoryId: number | null;

    constructor(data: Record<string, any>) {
        super(data);

        this.title = data.title;

        this.weekCode = data.weekCode ?? null;
        this.dayOfWeek = data.dayOfWeek ?? null;

        this.startHour = data.startHour ?? null;
        this.endHour = data.endHour ?? null;

        this.categoryId = data.categoryId ?? null;
    }

    get hours(): string | null {
        if (!this.startHour || !this.endHour) {
            return null;
        }
        return this.startHour + ' - ' + this.endHour;
    }
}
export default Event;