import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";
import { DayOfWeek, Subtask } from "../types";
import Base from "./base";

interface TaskUpdateData {
    title?: string;
    description?: string;
    categoryId?: string | null;
    subtasks?: Array<Subtask>;
}

abstract class Task extends Base {
    public title: string;
    public description: string | null;
    public order: number | null;
    public completedAt: Dayjs | null;
    public createdAt: Dayjs | null;
    public updatedAt: Dayjs | null;
    public categoryId: string | null;
    public projectId: string | null;
    public subtasks: Array<Subtask>;

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
        this.projectId = data.projectId ?? null;
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

    /** How many subtasks are ticked, and how many there are. */
    get subtaskProgress(): { done: number; total: number } {
        return {
            done: this.subtasks.filter((subtask) => subtask.completed).length,
            total: this.subtasks.length,
        };
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
            projectId: this.projectId,
            order: this.order,
            subtasks: this.subtasks,
            createdAt: this.createdAt?.toISOString() ?? null,
            updatedAt: this.updatedAt?.toISOString() ?? null,
            completedAt: this.completedAt?.toISOString() ?? null,
        }
    }

    /**
     * The request body the API expects for an upsert.
     *
     * One shape covers create and update, and the same shape covers both task types: a someday
     * task is simply one with no week and no day. `subtasks` goes out as a real array — the old
     * adapter ran it through JSON.stringify into a JSON body field, so the server stored a
     * string where it expected a list.
     */
    toApiPayload(): Record<string, any> {
        const weekly = this instanceof WeeklyTask ? this : null;

        return {
            id: this.id,
            title: this.title,
            description: this.description,
            category_id: this.categoryId,
            project_id: this.projectId,
            week_number: weekly?.weekCode ?? null,
            day_of_week: weekly ? parseInt(`${weekly.dayOfWeek}`, 10) : null,
            order: this.order ?? 0,
            subtasks: this.subtasks,
            completed_at: this.completedAt?.toISOString() ?? null,
        };
    }

    static create(type: 'weekly' | 'someday', data: Record<string, any>): WeeklyTask | SomedayTask | null {
        if (type === 'weekly' && data.weekCode && data.dayOfWeek !== undefined && data.dayOfWeek !== null) {
            return new WeeklyTask(data);
        } else if (type === 'someday') {
            return new SomedayTask(data);
        }
        return null;
    }

    /**
     * Build a task from one API row.
     *
     * The server no longer splits weekly from someday, so the row itself says which it is: a
     * null `week_number` means unscheduled. The caller does not pass a type any more.
     */
    static createFromApiData(data: Record<string, any>): WeeklyTask | SomedayTask | null {
        if (!data || !data.id) {
            return null;
        }

        const common = {
            id: data.id,
            title: data.title,
            description: data.description ?? null,
            categoryId: data.category_id ?? null,
            projectId: data.project_id ?? null,
            order: data.order ?? null,
            completedAt: data.completed_at ?? null,
            subtasks: data.subtasks ?? [],
            createdAt: data.created_at ?? null,
            updatedAt: data.updated_at ?? null,
        };

        if (data.week_number) {
            return new WeeklyTask({
                ...common,
                weekCode: data.week_number,
                // The board keys its columns by string, including "0" for the this-week bucket.
                dayOfWeek: `${data.day_of_week ?? 0}`,
            });
        }

        return new SomedayTask(common);
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
    get taskType(): 'weekly' | 'someday' {
        return 'someday';
    }

    get dayOfWeek(): DayOfWeek {
        return 'someday';
    }

    get date(): null {
        return null;
    }
}

export default Task;
