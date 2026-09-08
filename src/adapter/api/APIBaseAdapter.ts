import ky from 'ky';
import { boardToken, refreshBoardToken } from '../../utils/boardToken';

export abstract class APIBaseAdapter {
    protected apiUrl: string;
    protected client: typeof ky;

    constructor(apiUrl: string, apiKey: string | undefined) {
        this.apiUrl = apiUrl;

        this.client = ky.create({
            // `prefix`, not v1's `prefixUrl`, which ky 2 renamed.
            prefix: this.apiUrl,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            hooks: {
                /*
                 * The token is read per request, not baked into the client.
                 *
                 * It is replaced when it expires, and a client built once at startup would keep
                 * sending the dead one for the life of the tab — which is the entire failure
                 * this is here to prevent.
                 */
                beforeRequest: [
                    ({ request }) => {
                        const token = boardToken() ?? apiKey;

                        if (token) {
                            request.headers.set('Authorization', `Bearer ${token}`);
                        }
                    },
                ],
                /*
                 * A 401 means the twelve-hour token ran out under a tab that has been open for
                 * days. Ask for a new one and replay the request exactly once.
                 *
                 * Once, and only on the first failure: if the fresh token is refused too, the
                 * session has expired as well and no amount of retrying will help. The 401 then
                 * reaches the queue, which stops and says so — which is correct, because that
                 * user really does have to sign in again.
                 */
                afterResponse: [
                    async ({ request, response }) => {
                        if (response.status !== 401 || request.headers.get('X-WeekPal-Retried')) {
                            return response;
                        }

                        const token = await refreshBoardToken();

                        if (!token) {
                            return response;
                        }

                        const retry = request.clone();
                        retry.headers.set('Authorization', `Bearer ${token}`);
                        retry.headers.set('X-WeekPal-Retried', '1');

                        return ky(retry);
                    },
                ],
            },
        });
    }

    protected getClient(): typeof ky {
        return this.client;
    }
}
