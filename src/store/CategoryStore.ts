import Category from "../data/category";
import { ICategoryAdapter, ICategoryStore } from "../types";
import BaseStore from "./BaseStore";

class CategoryStore extends BaseStore implements ICategoryStore {

    private adapter: ICategoryAdapter | null;

    constructor(adapter?: ICategoryAdapter | null) {
        super('category', adapter);
        this.adapter = adapter ?? null;
    }

    async list(): Promise<Category[]> {
        if (this.shouldSync('categories', 'category')) {
            await this.pull();
        }

        return this.db.categories.toArray();
    }

    /**
     * Full-set reconcile, as for tasks: the server's list is the complete live set, so a
     * category missing from it was deleted elsewhere. Rows with a queued write are untouched.
     */
    private async pull(): Promise<void> {
        if (!this.adapter) {
            return;
        }

        try {
            const categories = await this.adapter.list();
            const pending = await this.syncService.pendingEntityIds('category');

            const incoming = categories.filter((category) => !pending.has(category.id));
            const returnedIds = new Set(categories.map((category) => category.id));

            const stale = (await this.db.categories.toArray())
                .filter((category) => !returnedIds.has(category.id) && !pending.has(category.id))
                .map((category) => category.id);

            await this.db.transaction('rw', this.db.categories, async () => {
                await this.db.categories.bulkDelete(stale);
                if (incoming.length > 0) {
                    await this.db.categories.bulkPut(incoming);
                }
            });

            this.setLastSync('categories');
        } catch (error) {
            console.error("Could not pull categories:", error);
        }
    }

    async reload(category: string | Category): Promise<Category | null> {
        const categoryId = typeof category === 'string' ? category : category.id;
        if (!categoryId) {
            return null;
        }

        return (await this.db.categories.get(categoryId)) ?? null;
    }

    private async put(category: Category): Promise<Category> {
        await this.db.categories.put(category);

        await this.syncService.enqueue({
            entityType: 'category',
            entityId: category.id,
            type: 'upsert',
        });

        return (await this.reload(category)) ?? category;
    }

    async create(category: Category): Promise<Category> {
        return this.put(category);
    }

    async update(category: Category): Promise<Category> {
        return this.put(category);
    }

    async delete(category: Category): Promise<void> {
        await this.db.categories.delete(category.id);

        await this.syncService.enqueue({
            entityType: 'category',
            entityId: category.id,
            type: 'delete',
        });
    }
}

export default CategoryStore;
