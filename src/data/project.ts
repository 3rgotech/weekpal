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

    constructor(data: Record<string, any>) {
        super(data);
        this.name = data.name;
        this.categoryId = data.categoryId ?? null;
    }

    static createFromApiData(data: Record<string, any>): Project | null {
        if (!data || !data.id) {
            return null;
        }

        return new Project({
            id: data.id,
            name: data.name,
            categoryId: data.category_id ?? null,
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
