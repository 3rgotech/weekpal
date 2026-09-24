import { AvoidanceReport, IInsightsAdapter, ProTeaserDecision, ProTeaserOutcome } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * The Avoidance Report.
 *
 * No local cache and no offline queue: it is a reading of server-side history, and a stale copy
 * would be a claim about the user's habits that stopped being true. Better to say it cannot be
 * fetched than to show last month's conclusion as though it were this month's.
 */
class APIInsightsAdapter extends APIBaseAdapter implements IInsightsAdapter {
    async avoidance(weeks = 12): Promise<AvoidanceReport | null> {
        try {
            const response = await this.getClient()
                .get('insights/avoidance', { searchParams: { weeks } })
                .json<{ data: AvoidanceReport }>();

            return response.data;
        } catch (error) {
            // 402 is "this is part of Pro" rather than a failure. The board should not have
            // offered the report to an account without a plan, but a lapsed subscription is
            // exactly the case where it might — and an error dialog would be the wrong answer.
            if ((error as any)?.response?.status === 402) {
                return null;
            }

            throw error;
        }
    }

    async reviewed(week: string): Promise<ProTeaserDecision> {
        const response = await this.getClient()
            .post('insights/teaser/reviewed', { json: { week } })
            .json<{ data: ProTeaserDecision }>();

        return response.data;
    }

    async respond(signature: string, outcome: ProTeaserOutcome): Promise<void> {
        await this.getClient().post('insights/teaser/respond', { json: { signature, outcome } });
    }
}

export default APIInsightsAdapter;
