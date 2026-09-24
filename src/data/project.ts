import Base from './base';

/**
 * A project — the custom list, optionally linked to one category.
 *
 * Tasks in a project inherit its category, so a project's `categoryId` is the authority and a
 * task's own value is a denormalised copy the backend keeps in step.
 *
 * There is no project UI yet; the model and its adapter exist so the schema and the API are
 * exercised from day one rather than bolted on later.
 */
class Project extends Base {
    public name: string;
    public categoryId: string | null;
    /**
     * Unscheduled tasks still to do in this project, as last counted — or null when nothing has
     * counted them. The drawer shows it before a backlog is opened; once one is loaded, the loaded
     * list is the truth, since it follows every drag in and out.
     */
    public backlogCount: number | null;

    constructor(data: Record<string, any>) {
        super(data);
        this.name = data.name;
        this.categoryId = data.categoryId ?? null;
        this.backlogCount = data.backlogCount ?? null;
    }

    static createFromApiData(data: Record<string, any>): Project | null {
        if (!data || !data.id) {
            return null;
        }

        return new Project({
            id: data.id,
            name: data.name,
            categoryId: data.category_id ?? null,
            // Only the listing carries it; an upsert's echo has nothing to count.
            backlogCount: data.backlog_count ?? null,
        });
    }

    toApiPayload(): Record<string, any> {
        return {
            id: this.id,
            name: this.name,
            category_id: this.categoryId,
        };
    }
}

export default Project;
