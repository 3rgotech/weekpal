import React from "react";
import { Button, Label, ListBox, Select } from "@heroui/react";
import type { Key } from "react-aria-components";
import { Bell, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAccount } from "../contexts/AccountContext";
import { useSettings } from "../contexts/SettingsContext";
import { browserTimezone } from "../utils/push";
import { QUARTER_HOURS, timeLabel } from "../utils/settings";
import { pushProblemKey, usePushDevice } from "../utils/usePushDevice";

interface ReminderPickerProps {
    /** "HH:MM", or null for no reminder. */
    value: string | null;
    onChange: (time: string | null) => void;
    /** Whether the task is on a day. A reminder is a time on that day, so it needs one. */
    hasDay: boolean;
}

/**
 * A push at a time on the task's own day.
 *
 * Only a time is chosen: the day is the task's, so moving the task moves the reminder with it.
 * Quarter hours, the briefing's steps, because the server looks every fifteen minutes.
 *
 * Pro, and disabled rather than hidden without it, like the briefing. Receiving is each browser's
 * own, as for the briefing: a reminder set here may well be received on a phone, so a browser
 * that does not receive it yet is told so and offered to, without stopping the choice.
 */
const ReminderPicker: React.FC<ReminderPickerProps> = ({ value, onChange, hasDay }) => {
    const { t } = useTranslation();
    const { subscribed } = useAccount();
    const { settings, updateSettings } = useSettings();
    const { support, available, deviceOn, busy, problem, receiveHere } = usePushDevice();

    const usable = subscribed && hasDay;

    const choose = (time: string | null) => {
        // Where the user is, kept up to date: "14:30" means nothing to the server alone.
        if (time !== null && settings.timezone !== browserTimezone()) {
            updateSettings({ timezone: browserTimezone() });
        }

        onChange(time);
    };

    /** The one line under the picker: why it cannot be used, or that this browser will not ring. */
    const hint = (() => {
        if (!subscribed) {
            return t("task.reminder.pro");
        }

        if (!hasDay) {
            return t("task.reminder.needs_day");
        }

        if (value === null) {
            return null;
        }

        const key = pushProblemKey({ support, available, problem });

        return key ? t(key) : null;
    })();

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
                <Select
                    className="min-w-0 flex-1 gap-1.5"
                    placeholder={t("task.reminder.none")}
                    value={usable ? value : null}
                    isDisabled={!usable}
                    onChange={(key: Key | null) => choose(key === null ? null : `${key}`)}
                >
                    <Label className="flex items-center gap-1 text-xs font-semibold text-wp-fg-secondary">
                        <Bell size={12} aria-hidden="true" />
                        {t("task.reminder.label")}
                    </Label>
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
                {usable && value !== null && (
                    <button
                        type="button"
                        onClick={() => choose(null)}
                        aria-label={t("task.reminder.clear")}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wp-track text-wp-fg-secondary cursor-pointer hover:text-wp-fg focus-visible:outline-2 focus-visible:outline-wp-accent"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
            {hint && <p className="text-xs leading-[1.4] text-wp-muted">{hint}</p>}
            {!hint && usable && value !== null && deviceOn === false && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-wp-muted">
                    {t("task.reminder.not_here")}
                    <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => { void receiveHere(); }}>
                        {t("settings.briefing.receive_here")}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ReminderPicker;
