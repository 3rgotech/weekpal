import { IShareAdapter, WeekShare } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * Week sharing — *(rt §16)* the distribution channel rather than a feature.
 *
 * No local cache and no offline queue, deliberately. Every other write on this board is
 * optimistic because a task belongs to the person typing it; a share link does not exist until
 * the server has minted the token, and showing someone a URL that has not been created yet —
 * which they would then paste to a colleague — is the one place optimism is a lie.
 */
class APIShareAdapter extends APIBaseAdapter implements IShareAdapter {
    async list(): Promise<WeekShare[]> {
        const response = await this.getClient().get('shares').json<{ data: WeekShare[] }>();

        return response.data ?? [];
    }

    /**
     * Share a week, replacing whatever link it had.
     *
     * The server revokes the previous one. The URL *is* the credential, so changing the terms
     * cannot mean editing a row other people are already holding.
     */
    async share(weekCode: string, options: { password?: string; expiresAt?: string; maxViews?: number }): Promise<WeekShare> {
        const response = await this.getClient()
            .put(`weeks/${weekCode}/share`, {
                json: {
                    ...(options.password ? { password: options.password } : {}),
                    ...(options.expiresAt ? { expires_at: options.expiresAt } : {}),
                    ...(options.maxViews ? { max_views: options.maxViews } : {}),
                },
            })
            .json<{ data: WeekShare }>();

        return response.data;
    }

    async revoke(weekCode: string): Promise<void> {
        await this.getClient().delete(`weeks/${weekCode}/share`);
    }
}

export default APIShareAdapter;
