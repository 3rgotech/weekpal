import { Account, IAccountAdapter } from "../../types";
import { APIBaseAdapter } from "./APIBaseAdapter";

/**
 * Who the board is being shown to, and what it is allowed to offer them.
 *
 * Read once on boot and not written: everything here is decided by the account and its
 * subscription, neither of which the board is in a position to change.
 */
export default class APIAccountAdapter extends APIBaseAdapter implements IAccountAdapter {
    async get(): Promise<Account> {
        const response = await this.getClient()
            .get('user')
            .json<{ data: { id: number; name: string; subscribed?: boolean } }>();

        return {
            id: response.data.id,
            name: response.data.name,
            // Defaulted rather than trusted: an older backend has no such field, and a board that
            // read `undefined` as paid would offer controls whose writes the server then refuses.
            subscribed: response.data.subscribed === true,
        };
    }
}
