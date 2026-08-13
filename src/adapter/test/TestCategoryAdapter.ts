import Category from '../../data/category';
import { ICategoryAdapter } from '../../types';

/** A no-op backend for `VITE_DATA_SOURCE=test`. See {@link TestTaskAdapter}. */
class TestCategoryAdapter implements ICategoryAdapter {
    async list(): Promise<Category[]> {
        return [];
    }

    async upsert(category: Category): Promise<Category> {
        return category;
    }

    async delete(_id: string): Promise<void> {
        // Nothing to do — the fixtures live in IndexedDB.
    }
}

export default TestCategoryAdapter;
