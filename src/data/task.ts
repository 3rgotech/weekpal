import { Dayjs } from "dayjs";
import { getDayJs } from "../utils/dayjs";
import { DayOfWeek } from "../types";
import Base from "./base";

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

        const dayjs = getDayJs();
        this.title = data.title;
        this.description = data.description ?? null;

        this.weekCode = data.weekCode ?? null;
        this.dayOfWeek = data.dayOfWeek ?? null;
        this.order = data.order ?? null;

        this.completedAt = data.completedAt ? dayjs(data.completedAt) : null;
        this.createdAt = data.createdAt ? dayjs(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? dayjs(data.updatedAt) : null;

        this.categoryId = data.categoryId ?? null;
    }

    get completed(): boolean {
        return this.completedAt !== null;
    }

    // serialize(): Record<string, any> {
    //     return {
    //         id: this.id,
    //         title: this.title,
    //         description: this.description ?? null,
    //         order: this.order,
    //         category: this.category?.id ?? null,
    //         created_at: this.createdAt.toISOString(),
    //         updated_at: this.updatedAt.toISOString(),
    //         completedAt: this.completedAt?.toISOString() ?? null,
    //     }
    // }
}

export default Task;