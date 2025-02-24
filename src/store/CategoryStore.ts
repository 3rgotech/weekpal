import Category from "../data/category";
import { ICategoryAdapter, ICategoryStore } from "../types";
import BaseStore from "./BaseStore";
import { CategoryDB } from "./db";

class CategoryStore extends BaseStore implements ICategoryStore {

    declare protected adapter: ICategoryAdapter | null;
    private db: CategoryDB;

    constructor(adapter?: ICategoryAdapter) {
        super(adapter);
        this.db = new CategoryDB();
    }

    async list(): Promise<Category[]> {
        if (this.shouldSync('categories') && navigator.onLine) {
            try {
                const adapterCategories = await this.adapter?.list();
                if (adapterCategories) {
                    await this.db.categories.bulkPut(adapterCategories);
                    this.setLastSync('categories');
                }
            } catch (error) {
                console.error("Error listing categories : ", error);
            }
        }

        const categories = await this.db.categories.toArray();
        return categories;
    }

    async reload(category: number | Category): Promise<Category | null> {
        const reloadedCategory = await this.db.categories.get(typeof category === 'number' ? category : category.id);
        return reloadedCategory ?? null;
    }

    async create(category: Category): Promise<Category> {
        await this.db.categories.add(category);
        if (this.canSync()) {
            try {
                const serverId = await this.adapter?.create(category);
                if (serverId) {
                    category.serverId = serverId;
                    await this.db.categories.put(category);
                }
            } catch (error) {
                console.error("Error creating category : ", error);
            }
        }
        return category;
    }

    async update(category: Category): Promise<Category> {
        await this.db.categories.put(category);
        if (this.canSync()) {
            try {
                await this.adapter?.update(category);
            } catch (error) {
                console.error("Error updating category : ", error);
            }
        }
        const updatedCategory = await this.reload(category);
        return updatedCategory ?? category;
    }

    async delete(category: Category): Promise<void> {
        await this.db.categories.delete(category.id);
        if (this.canSync()) {
            try {
                await this.adapter?.delete(category);
            } catch (error) {
                console.error("Error deleting category : ", error);
            }
        }
    }

}

export default CategoryStore;