import { ChangelogEntry, IChangelogAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

interface ChangelogRow {
    id: number;
    version: string | null;
    title: string;
    description: string;
    body: string;
    published_at: string | null;
    seen: boolean;
}

/**
 * Reading the release notes.
 *
 * Not cached in IndexedDB, unlike the board's own data. The notes are small, they are read once
 * per session, and — the reason that decides it — a cached copy would go on announcing a release
 * the user has already acknowledged on another device. Offline, there is simply nothing new to
 * say, which is the honest answer.
 */
class APIChangelogAdapter extends APIBaseAdapter implements IChangelogAdapter {
    async list(): Promise<ChangelogEntry[]> {
        const response = await this.getClient().get('changelog').json<{ data: ChangelogRow[] }>();

        return response.data.map((row) => ({
            id: row.id,
            version: row.version,
            title: row.title,
            description: row.description,
            body: row.body,
            publishedAt: row.published_at,
            seen: row.seen,
        }));
    }

    async markRead(): Promise<void> {
        await this.getClient().post('changelog/read');
    }
}

export default APIChangelogAdapter;
