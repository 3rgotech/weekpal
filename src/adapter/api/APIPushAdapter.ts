import { IPushAdapter } from '../../types';
import { APIBaseAdapter } from './APIBaseAdapter';

/**
 * This browser's push subscription, handed to the server so it can send the morning briefing.
 *
 * Only the parts the server needs to encrypt to and reach the browser: the endpoint, and the two
 * keys. Registering the same endpoint again updates it rather than adding a second.
 */
class APIPushAdapter extends APIBaseAdapter implements IPushAdapter {
    async subscribe(subscription: PushSubscriptionJSON): Promise<void> {
        await this.getClient().post('push-subscriptions', {
            json: {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.keys?.p256dh,
                    auth: subscription.keys?.auth,
                },
            },
        });
    }

    async unsubscribe(endpoint: string): Promise<void> {
        await this.getClient().delete('push-subscriptions', { json: { endpoint } });
    }
}

export default APIPushAdapter;
