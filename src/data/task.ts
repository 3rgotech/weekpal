import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";
import { DayOfWeek } from "../types";
import Base from "./base";

interface TaskUpdateData {
    title?: string;
    description?: string;
    categoryId?: number;
}

class Task extends Base {
    public title: string;
    public description: string | null;

    public weekCode: string | null;
    public dayOfWeek: DayOfWeek | null;
    public order: number | null;

    public completedAt: Dayjs | null;
    public createdAt: Dayjs | null;
    public updatedAt: Dayjs | null;

    public categoryId: number | null;

    constructor(data: Record<string, any>) {
        super(data);

        this.title = data.title;
        this.description = data.description ?? null;

        this.weekCode = data.weekCode ?? null;
        this.dayOfWeek = data.dayOfWeek ?? null;
        this.order = data.order ?? null;

        this.completedAt = this.parseDate(data.completedAt);
        this.createdAt = this.parseDate(data.createdAt);
        this.updatedAt = this.parseDate(data.updatedAt);

        this.categoryId = data.categoryId ?? null;
    }

    update(data: TaskUpdateData) {
        if (data.title !== undefined) {
            this.title = data.title;
        }
        if (data.description !== undefined) {
            this.description = data.description;
        }
        if (data.categoryId !== undefined) {
            this.categoryId = data.categoryId;
        }
    }

    get completed(): boolean {
        return this.completedAt !== null;
    }

    get date(): Dayjs | null {
        const dayjs = getDayJs();

        if (!this.weekCode || !this.dayOfWeek) {
            return null;
        }

        return dayjs(this.weekCode, "GGGG[w]WW").startOf("isoWeek").add(parseInt(`${this.dayOfWeek}`, 10) - 1, "day");
    }

    set date(date: Dayjs) {
        const dayjs = getDayJs();

        this.weekCode = dayjs(date).format("GGGG[w]WW");
        this.dayOfWeek = `${dayjs(date).isoWeekday()}` as DayOfWeek;
    }

    serialize(): Record<string, any> {

        return {
            id: this.id,
            title: this.title,
            description: this.description,
            categoryId: this.categoryId,
            weekCode: this.weekCode,
            dayOfWeek: this.dayOfWeek,
            date: this.date,
            order: this.order,
            createdAt: this.createdAt?.toISOString() ?? null,
            updatedAt: this.updatedAt?.toISOString() ?? null,
            completedAt: this.completedAt?.toISOString() ?? null,
        }
    }
}

export default Task;