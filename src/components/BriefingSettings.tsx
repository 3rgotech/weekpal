import React from "react";
import { Button, Label, ListBox, Select } from "@heroui/react";
import type { Key } from "react-aria-components";
import clsx from "clsx";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../contexts/SettingsContext";
import { useAccount } from "../contexts/AccountContext";
import { QUARTER_HOURS, timeLabel } from "../utils/settings";
import { Weekday, orderedWeekdays, toggleWorkingDay } from "../utils/week";
import { browserTimezone } from "../utils/push";
import { pushProblemKey, usePushDevice } from "../utils/usePushDevice";
import { Row, Segmented } from "./SettingsRow";

interface BriefingSettingsProps {
    /** A weekday's name in the board's language, as the rest of the dialog prints them. */
    nameOf: (day: Weekday, format: string) => string;
}

/**
 * The morning briefing: on or off, which days, what time, and whether an empty day gets one.
 *
 * Two things are being switched on, and they are kept apart on purpose. The setting is the
 * account's — the server sends on the chosen days wherever the user is signed in. Receiving it is
 * each browser's own, and needs that browser's permission. Turning it on from a phone subscribes
 * the phone; the laptop then says it is not receiving yet, and offers to.
 *
 * Pro, and disabled rather than hidden without it, like the layouts: a control you can see and
 * cannot use says the feature exists.
 */
const BriefingSettings: React.FC<BriefingSettingsProps> = ({ nameOf }) => {
    const { t } = useTranslation();
    const { subscribed } = useAccount();
    const { settings, updateSettings } = useSettings();
    const { support, available, deviceOn, busy, problem, receiveHere } = usePushDevice();
    const usable = subscribed && available && support === "ready";

    const switchOn = async () => {
        if (await receiveHere()) {
            // Where the user is, sent with the switch: "8:00" means nothing to the server alone.
            updateSettings({ briefingEnabled: true, timezone: browserTimezone() });
        }
    };

    /** The one line under the switch: why it cannot be used, or where it is being received. */
    const status = (() => {
        if (!subscribed) {
            return t("settings.briefing.pro");
        }

        const key = pushProblemKey({ support, available, problem });

        return key ? t(key) : null;
    })();

    const on = subscribed && settings.briefingEnabled;

    return (
        <>
            <Row label={t("settings.briefing.label")} hint={t("settings.briefing.hint")}>
                {/* One line where it fits: the switch, then what it means for this device beside
                    it rather than under it. Wraps on a phone too narrow for both. */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Segmented
                        value={on}
                        isDisabled={!usable || busy}
                        onChange={(enabled) => (enabled
                            ? void switchOn()
                            : updateSettings({ briefingEnabled: false }))}
                        options={[
                            { value: false, label: t("settings.briefing.off") },
                            { value: true, label: t("settings.briefing.on") },
                        ]}
                    />
                    {status && <p className="text-xs leading-[1.4] text-wp-muted">{status}</p>}
                    {/* On for the account, not yet here: switched on from another device. */}
                    {!status && on && deviceOn === false && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-wp-muted">
                            {t("settings.briefing.not_here")}
                            <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => { void receiveHere(); }}>
                                {t("settings.briefing.receive_here")}
                            </Button>
                        </div>
                    )}
                    {!status && on && deviceOn === true && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Check size={14} aria-hidden="true" />
                            {t("settings.briefing.here")}
                        </span>
                    )}
                </div>
            </Row>

            {on && (
                <>
                    {/* The working-day buttons' shape, in the user's own week order. */}
                    <Row label={t("settings.briefing.days")}>
                        <div className="flex gap-1">
                            {orderedWeekdays(settings.weekStartsOn).map((day) => {
                                const chosen = settings.briefingDays.includes(day);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        aria-pressed={chosen}
                                        aria-label={nameOf(day, "dddd")}
                                        onClick={() => updateSettings({
                                            briefingDays: toggleWorkingDay(settings.briefingDays, day),
                                        })}
                                        className={clsx(
                                            "flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.4px] transition-colors cursor-pointer",
                                            "focus-visible:outline-2 focus-visible:outline-wp-accent",
                                            chosen
                                                ? "bg-wp-accent text-wp-on-accent"
                                                : "bg-wp-track text-wp-muted hover:text-wp-fg-secondary",
                                        )}
                                    >
                                        {nameOf(day, "dd")}
                                    </button>
                                );
                            })}
                        </div>
                    </Row>
                    <Row label={t("settings.briefing.time")} hint={t("settings.briefing.time_hint")}>
                        <Select
                            value={settings.briefingTime}
                            onChange={(key: Key | null) => key !== null && updateSettings({
                                briefingTime: `${key}`,
                                timezone: browserTimezone(),
                            })}
                            className="w-full"
                            aria-label={t("settings.briefing.time")}
                        >
                            <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                                <ListBox>
                                    {QUARTER_HOURS.map((time) => (
                                        <ListBox.Item key={time} id={time} textValue={timeLabel(settings.language, time)}>
                                            <Label>{timeLabel(settings.language, time)}</Label>
                                        </ListBox.Item>
                                    ))}
                                </ListBox>
                            </Select.Popover>
                        </Select>
                    </Row>
                    <Row label={t("settings.briefing.empty")}>
                        <Segmented
                            value={settings.briefingWhenEmpty}
                            onChange={(briefingWhenEmpty) => updateSettings({ briefingWhenEmpty })}
                            options={[
                                { value: false, label: t("settings.briefing.empty_skip") },
                                { value: true, label: t("settings.briefing.empty_send") },
                            ]}
                        />
                    </Row>
                </>
            )}
        </>
    );
};

export default BriefingSettings;
