import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";
import { DayOfWeek } from "../types";
import Base from "./base";

interface TaskUpdateData {
    title?: string;
    description?: string;
    categoryId?: number;
    subtasks?: Array<any>;
}

abstract class Task extends Base {
    public title: string;
    public description: string | null;
    public order: number | null;
    public completedAt: Dayjs | null;
    public createdAt: Dayjs | null;
    public updatedAt: Dayjs | null;
    public categoryId: number | null;
    public subtasks: Array<any>;

    constructor(data: Record<string, any>) {
        super(data);
        const dayjs = getDayJs();

        this.title = data.title;
        this.description = data.description ?? null;
        this.order = data.order ?? null;
        this.completedAt = this.parseDate(data.completedAt);
        this.createdAt = data.createdAt ? this.parseDate(data.createdAt) : dayjs();
        this.updatedAt = this.parseDate(data.updatedAt);
        this.categoryId = data.categoryId ?? null;
        this.subtasks = data.subtasks ?? [];
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
        if (data.subtasks !== undefined) {
            this.subtasks = data.subtasks;
        }
    }

    get completed(): boolean {
        return this.completedAt !== null;
    }

    abstract get taskType(): 'weekly' | 'someday';

    serialize(): Record<string, any> {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            categoryId: this.categoryId,
            order: this.order,
            subtasks: this.subtasks,
            createdAt: this.createdAt?.toISOString() ?? null,
            updatedAt: this.updatedAt?.toISOString() ?? null,
            completedAt: this.completedAt?.toISOString() ?? null,
        }
    }

    static create(type: 'weekly' | 'someday', data: Record<string, any>): WeeklyTask | SomedayTask | null {
        if (type === 'weekly' && data.weekCode && data.dayOfWeek) {
            return new WeeklyTask({
                // TODO : generate front-end ID
                ...data
            });
        } else if (type === 'someday') {
            return new SomedayTask({
                // TODO : generate front-end ID
                ...data
            });
        }
        return null;
    }

    static createFromApiData(type: 'weekly' | 'someday', data: Record<string, any>): WeeklyTask | SomedayTask | null {
        // Determine if it's a weekly or someday task based on the data
        if (type === 'weekly' && data.week_number && data.day_of_week) {
            return new WeeklyTask({
                id: data.id,
                title: data.title,
                description: data.description || null,
                weekCode: data.week_number,
                dayOfWeek: data.day_of_week.toString(),
                categoryId: data.category_id || null,
                order: data.order || null,
                completedAt: data.completed_at,
                subtasks: data.subtasks || [],
                serverId: data.id,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            });
        } else if (type === 'someday') {
            // For someday tasks, we need the context weekCode to display it
            return new SomedayTask({
                id: data.id,
                title: data.title,
                description: data.description || null,
                categoryId: data.category_id || null,
                order: data.order || null,
                completedAt: data.completed_at,
                subtasks: data.subtasks || [],
                serverId: data.id,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            });
        }
        return null;
    }
}

export class WeeklyTask extends Task {
    public weekCode: string;
    public dayOfWeek: DayOfWeek;

    constructor(data: Record<string, any>) {
        super(data);
        this.weekCode = data.weekCode;
        this.dayOfWeek = data.dayOfWeek;
    }

    get taskType(): 'weekly' | 'someday' {
        return 'weekly';
    }

    get date(): Dayjs | null {
        const dayjs = getDayJs();
        return dayjs(this.weekCode, "GGGG[w]WW").startOf("isoWeek").add(parseInt(`${this.dayOfWeek}`, 10) - 1, "day");
    }

    set date(date: Dayjs) {
        const dayjs = getDayJs();
        this.weekCode = dayjs(date).format("GGGG[w]WW");
        this.dayOfWeek = `${dayjs(date).isoWeekday()}` as DayOfWeek;
    }

    override serialize(): Record<string, any> {
        return {
            ...super.serialize(),
            weekCode: this.weekCode,
            dayOfWeek: this.dayOfWeek,
            date: this.date,
        }
    }
}

export class SomedayTask extends Task {
    constructor(data: Record<string, any>) {
        super(data);
        // this.weekCode = data.weekCode ?? null;
    }

    get taskType(): 'weekly' | 'someday' {
        return 'someday';
    }

    get dayOfWeek(): DayOfWeek {
        return 'someday';
    }

    get date(): null {
        return null;
    }

    override serialize(): Record<string, any> {
        return {
            ...super.serialize(),
            // weekCode: this.weekCode,
            // dayOfWeek: this.dayOfWeek,
        }
    }
}

export default Task;