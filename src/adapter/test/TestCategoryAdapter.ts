import Category from '../../data/category';
import { ICategoryAdapter } from '../../types';

class TestCategoryAdapter implements ICategoryAdapter {
    constructor() {
        console.log('[TestCategoryAdapter] Initialized');
    }

    async list(): Promise<Category[]> {
        console.log('[TestCategoryAdapter] Listing categories');

        // Return empty array for testing
        return [];
    }

    async create(category: Category): Promise<number> {
        console.log('[TestCategoryAdapter] Creating category:', {
            name: category.name,
            color: category.color
        });

        // Return a mock server ID
        return Math.floor(Math.random() * 10000);
    }

    async update(category: Category): Promise<void> {
        console.log('[TestCategoryAdapter] Updating category:', {
            id: category.serverId,
            name: category.name,
            color: category.color
        });
    }

    async delete(category: Category): Promise<void> {
        console.log('[TestCategoryAdapter] Deleting category:', {
            id: category.serverId,
            name: category.name
        });
    }
}

export default TestCategoryAdapter;