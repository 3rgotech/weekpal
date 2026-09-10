import { Diagnostics } from '../../utils/diagnostics';
import { IFeedbackAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * Sending a bug report or a suggestion.
 *
 * Not queued through the offline outbox, deliberately, even though the board queues everything
 * else. Two reasons: a report is not the user's data — losing one costs a message rather than a
 * task — and the widget tells them plainly whether it was sent. A report silently sitting in a
 * queue would be worse than one that failed loudly, because the user would believe they had told
 * somebody.
 */
class APIFeedbackAdapter extends APIBaseAdapter implements IFeedbackAdapter {
    async send(kind: 'bug' | 'idea', message: string, diagnostics: Diagnostics, weekCode: string | null): Promise<void> {
        await this.getClient().post('feedback', {
            json: {
                kind,
                message,
                diagnostics,
                ...(weekCode ? { week_number: weekCode } : {}),
            },
        });
    }
}

export default APIFeedbackAdapter;
