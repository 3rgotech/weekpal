import Category from "../data/category";
import { ICategoryAdapter, ICategoryStore } from "../types";
import BaseStore from "./BaseStore";

class CategoryStore extends BaseStore implements ICategoryStore {

    declare protected adapter: ICategoryAdapter | null;

    constructor(adapter?: ICategoryAdapter) {
        super(adapter);
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
        const categoryId = typeof category === 'number' ? category : category.id;
        if (!categoryId) {
            return null;
        }
        const reloadedCategory = await this.db.categories.get(categoryId);
        return reloadedCategory ?? null;
    }

    async create(category: Category): Promise<Category> {
        await this.db.categories.add(category);

        // Make sure the category has an ID (assigned by IndexedDB)
        const savedCategory = await this.reload(category);
        if (!savedCategory || !savedCategory.id) {
            return category; // Return original if reload fails
        }

        // Track this as a pending change
        if (this.syncService) {
            this.syncService.addPendingChange({
                id: savedCategory.id,
                type: 'create',
                entityType: 'category'
            });
        }

        // Try to sync immediately if we can
        if (this.canSync()) {
            try {
                const serverId = await this.adapter?.create(savedCategory);
                if (serverId) {
                    savedCategory.serverId = serverId;
                    await this.db.categories.put(savedCategory);
                }
            } catch (error) {
                console.error("Error creating category : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }

        return savedCategory;
    }

    async update(category: Category): Promise<Category> {
        await this.db.categories.put(category);

        // Track this as a pending change if it has a local ID
        if (category.id && this.syncService) {
            this.syncService.addPendingChange({
                id: category.id,
                type: 'update',
                entityType: 'category'
            });
        }

        // Try to sync immediately if possible
        if (this.canSync() && category.serverId) {
            try {
                await this.adapter?.update(category);
            } catch (error) {
                console.error("Error updating category : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }

        const updatedCategory = await this.reload(category);
        return updatedCategory ?? category;
    }

    async delete(category: Category): Promise<void> {
        if (!category.id) {
            return;
        }

        // Store the server ID before deletion for sync purposes
        const categoryData = {
            serverId: category.serverId
        };

        // Track this as a pending change if it has a server ID
        if (category.serverId && this.syncService) {
            this.syncService.addPendingChange({
                id: category.id,
                type: 'delete',
                entityType: 'category',
                data: categoryData
            });
        }

        await this.db.categories.delete(category.id);

        // Try to sync immediately if possible
        if (this.canSync() && category.serverId) {
            try {
                await this.adapter?.delete(category);
            } catch (error) {
                console.error("Error deleting category : ", error);
                // Error is already tracked in pendingChanges, will retry later
            }
        }
    }
}

export default CategoryStore;