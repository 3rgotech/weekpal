import { ISettingsAdapter, Settings } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * Board settings.
 *
 * The only part of the API that speaks camelCase: the field names are the ones
 * the SPA has always written to localStorage, and API-CONTRACT.md §5 keeps them
 * rather than making every existing browser migrate.
 */
class APISettingsAdapter extends APIBaseAdapter implements ISettingsAdapter {
    async get(): Promise<Settings> {
        const response = await this.getClient().get('settings').json<{ data: Settings }>();

        return response.data;
    }

    /**
     * Sends only what changed, and returns the server's complete object.
     *
     * A partial patch matters for more than bandwidth: echoing the whole object
     * back would overwrite a setting changed on another device between this
     * client's last read and this write.
     */
    async update(patch: Partial<Settings>): Promise<Settings> {
        const response = await this.getClient()
            .put('settings', { json: patch })
            .json<{ data: Settings }>();

        return response.data;
    }
}

export default APISettingsAdapter;
