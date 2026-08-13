import { Dayjs } from "dayjs";
import Base from "./base";
import { DayOfWeek } from "../types";

class Event extends Base {
    public title: string;

    public weekCode: string | null;
    public dayOfWeek: DayOfWeek | null;

    public startHour: string | null;
    public endHour: string | null;

    public categoryId: string | null;

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

    /** An all-day event carries no times. */
    get isAllDay(): boolean {
        return this.startHour === null && this.endHour === null;
    }

    /**
     * Build an event from one API row.
     *
     * The API speaks snake_case here, unlike settings. Passing a raw row to the
     * constructor silently produced an event with no week, no day and no times —
     * every field read as `undefined` and defaulted to null — so it vanished from
     * the board rather than failing loudly.
     */
    static createFromApiData(data: Record<string, any>): Event | null {
        if (!data || !data.id) {
            return null;
        }

        return new Event({
            id: data.id,
            title: data.title,
            weekCode: data.week_number ?? null,
            dayOfWeek: data.day_of_week === null || data.day_of_week === undefined
                ? null
                : `${data.day_of_week}`,
            startHour: data.start_hour ?? null,
            endHour: data.end_hour ?? null,
            categoryId: data.category_id ?? null,
        });
    }
}
export default Event;