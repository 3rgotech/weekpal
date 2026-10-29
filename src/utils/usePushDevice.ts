import { useEffect, useState } from "react";
import { useData } from "../contexts/DataContext";
import { getEnvConfig } from "./env";
import { PushSupport, isBrave, isSubscribed, pushSupport, subscribeThisDevice } from "./push";

export type PushProblem = "denied" | "unsupported" | "failed" | "brave" | null;

export interface PushDevice {
    /** Whether this browser can receive pushes at all, and if not, why. */
    support: PushSupport;
    /** A server to send them and a key to subscribe with. False on a demo board. */
    available: boolean;
    /** Whether this browser holds a subscription; null until the check settles. */
    deviceOn: boolean | null;
    busy: boolean;
    /** What went wrong the last time this browser was asked. */
    problem: PushProblem;
    /** Ask for permission and subscribe this browser. True once it is receiving. */
    receiveHere: () => Promise<boolean>;
}

/**
 * Receiving pushes on this browser: the morning briefing and task reminders both need it.
 *
 * What is switched on is the account's; receiving is each browser's own, and needs its permission.
 */
export function usePushDevice(): PushDevice {
    const { pushAdapter } = useData();
    const { webPushKey } = getEnvConfig();

    const [deviceOn, setDeviceOn] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<PushProblem>(null);

    useEffect(() => {
        void isSubscribed().then(setDeviceOn).catch(() => setDeviceOn(false));
    }, []);

    const receiveHere = async (): Promise<boolean> => {
        if (!pushAdapter || !webPushKey) {
            return false;
        }

        setBusy(true);
        setProblem(null);

        try {
            const outcome = await subscribeThisDevice(webPushKey, pushAdapter);

            if (outcome !== "subscribed") {
                setProblem(outcome);

                return false;
            }

            setDeviceOn(true);

            return true;
        } catch (error) {
            console.error("Could not turn on notifications for this device:", error);
            setProblem(isBrave() ? "brave" : "failed");

            return false;
        } finally {
            setBusy(false);
        }
    };

    return {
        support: pushSupport(),
        available: pushAdapter !== null && webPushKey !== undefined,
        deviceOn,
        busy,
        problem,
        receiveHere,
    };
}

/**
 * The settings dialog's line for a browser that cannot receive pushes, or null when it can.
 * Shared so the task editor says the same thing in the same words.
 */
export function pushProblemKey({ support, available, problem }: Pick<PushDevice, "support" | "available" | "problem">): string | null {
    if (!available) {
        return "settings.briefing.unavailable";
    }

    if (support === "install") {
        return "settings.briefing.install";
    }

    if (support === "denied" || problem === "denied") {
        return "settings.briefing.denied";
    }

    if (support === "unsupported" || problem === "unsupported") {
        return "settings.briefing.unsupported";
    }

    if (problem === "brave") {
        return "settings.briefing.brave";
    }

    if (problem === "failed") {
        return "settings.briefing.failed";
    }

    return null;
}
