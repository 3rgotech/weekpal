import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Account } from "../types";
import AdapterFactory from "../adapter";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure } from "../utils/syncStatus";

interface AccountContextProps {
    account: Account | null;
    /** Whether the board may offer paid controls. False until the account is known. */
    subscribed: boolean;
}

const AccountContext = createContext<AccountContextProps | undefined>(undefined);

/**
 * Who the board is being shown to.
 *
 * Kept apart from `SettingsContext` on purpose: settings are the user's choices and are written
 * back, whereas this is what their account entitles them to and is read-only here. Mixing the two
 * would put a value the client cannot change into the object the client saves.
 *
 * **This is advisory.** It decides which controls are offered, never which writes succeed — the
 * server checks entitlement again on anything that needs it. A client can be told anything, and
 * this one is told by a request that a determined person can answer for themselves.
 *
 * Not cached in localStorage, unlike settings. A stale "subscribed" read from disk would offer
 * paid controls to an account that has since lapsed, and the board is useless offline anyway if
 * it has never reached the API. Unknown means not subscribed.
 */
const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [account, setAccount] = useState<Account | null>(null);

    const adapter = useMemo(() => AdapterFactory.createAdapters().accountAdapter, []);

    useEffect(() => {
        if (!adapter) {
            return;
        }

        let cancelled = false;

        adapter
            .get()
            .then((loaded) => {
                if (!cancelled) {
                    setAccount(loaded);
                }
            })
            .catch((error) => {
                // Not fatal: the board works without knowing the account, it just offers the free
                // set. Reported so an expired session shows up in the sync indicator.
                reportSyncFailure(classifyFailure(error));
                console.error("Could not load the account from the server:", error);
            });

        return () => {
            cancelled = true;
        };
    }, [adapter]);

    return (
        <AccountContext.Provider value={{ account, subscribed: account?.subscribed ?? false }}>
            {children}
        </AccountContext.Provider>
    );
};

/**
 * Optional on purpose, like `useShortcuts`: the print sheet and the tests render pieces of the
 * board outside the provider, and a component that throws when nobody is listening would take
 * them with it. Nothing known means nothing paid for.
 */
const useAccount = (): AccountContextProps =>
    useContext(AccountContext) ?? { account: null, subscribed: false };

export { AccountContext, AccountProvider, useAccount };
