import Category from '../../data/category';
import { ICategoryAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

class APICategoryAdapter extends APIBaseAdapter implements ICategoryAdapter {
    async list(): Promise<Category[]> {
        const response = await this.getClient().get('categories').json<{ data: any[] }>();

        return (response.data ?? []).map((row) => new Category({
            id: row.id,
            name: row.name,
            color: row.color,
            dayLimit: row.day_limit ?? null,
            isPrivate: row.is_private ?? false,
        }));
    }

    /**
     * `color` travels as a Tailwind colour name — "sky", not "#0ea5e9".
     *
     * The backend used to validate this field as `hex_color` while the frontend has always sent
     * names, so every category write failed validation. The API now speaks names.
     */
    async upsert(category: Category): Promise<Category> {
        const response = await this.getClient()
            .put(`categories/${category.id}`, {
                // Sent only when there is one. The server refuses a limit from an account without
                // the plan, and clears any it already held on the way through — so an unpaid save
                // must not carry the field at all, or a rename would be rejected outright.
                json: {
                    name: category.name,
                    color: category.color,
                    ...(category.dayLimit === null ? {} : { day_limit: category.dayLimit }),
                    // Always sent, unlike `day_limit`: privacy is free on every plan, so there
                    // is no tier for the server to refuse it on, and omitting it would make
                    // "turn this back off again" impossible to express.
                    is_private: category.isPrivate,
                },
            })
            .json<{ data: any }>();

        return new Category({
            id: response.data.id,
            name: response.data.name,
            color: response.data.color,
            dayLimit: response.data.day_limit ?? null,
            isPrivate: response.data.is_private ?? false,
        });
    }

    async delete(id: string): Promise<void> {
        await this.getClient().delete(`categories/${id}`);
    }
}

export default APICategoryAdapter;
