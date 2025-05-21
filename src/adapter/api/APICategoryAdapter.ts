import Category from '../../data/category';
import { ICategoryAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

class APICategoryAdapter extends APIBaseAdapter implements ICategoryAdapter {
    async list(): Promise<Category[]> {
        try {
            const response = await this.getClient().get('categories').json<{ data: any }>();
            const data = response.data;

            if (!Array.isArray(data)) {
                return [];
            }

            return data.map((apiCategory: any) => {
                return new Category({
                    id: apiCategory.id,
                    name: apiCategory.name,
                    color: apiCategory.color,
                    serverId: apiCategory.id,
                });
            });
        } catch (error) {
            console.error('Error fetching categories from API:', error);
            throw error;
        }
    }

    async create(category: Category): Promise<number> {
        try {
            const payload = {
                name: category.name,
                color: category.color,
            };

            const response = await this.getClient().post('categories/create', {
                json: payload
            }).json<{ id?: number }>();

            return response.id || 0;
        } catch (error) {
            console.error('Error creating category on API:', error);
            throw error;
        }
    }

    async update(category: Category): Promise<void> {
        try {
            if (!category.serverId) {
                console.error('Cannot update category without a server ID');
                return;
            }

            const payload = {
                name: category.name,
                color: category.color,
            };

            await this.getClient().put(`categories/${category.serverId}`, {
                json: payload
            });
        } catch (error) {
            console.error('Error updating category on API:', error);
            throw error;
        }
    }

    async delete(category: Category): Promise<void> {
        try {
            if (!category.serverId) {
                console.error('Cannot delete category without a server ID');
                return;
            }

            await this.getClient().delete(`categories/${category.serverId}`);
        } catch (error) {
            console.error('Error deleting category from API:', error);
            throw error;
        }
    }
}

export default APICategoryAdapter;