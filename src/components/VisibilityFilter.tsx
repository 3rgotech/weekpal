import { Dropdown, Label } from '@heroui/react'
import React from 'react'
import { ICON_BUTTON_WRAPPER_CLASS, MENU_ITEM_CLASS } from '../utils/color';
import { ICON_BUTTON_CLASS } from '../utils/color';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { CalendarOff, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, CalendarDays } from 'lucide-react';
import { icons } from '../utils/icon';
import clsx from 'clsx';

/**
 * What the board is currently showing you, and what it is leaving out.
 *
 * Three switches rather than a settings page: each of these is a thing somebody changes *while
 * looking at a week* — hiding what is done to see what is left, hiding the calendar to plan
 * without it, opening the calendar out to remember what a meeting actually is. A control you
 * reach for mid-thought does not belong two clicks into a dialog.
 *
 * Each item names the action rather than the state, which is why the labels flip: "Hide completed
 * tasks" is a button, "Completed tasks: shown" is a status line pretending to be one.
 */
const VisibilityFilter = () => {
    const { settings, updateSettings } = useSettings();
    const { t } = useTranslation();

    const Icon = icons.eye;

    // The item carried no `onAction` at all, so the wide board's only completed-tasks toggle did
    // nothing: it drew a checkmark and left the setting alone. The phone menu had been wired
    // correctly all along, which is why it worked there and not here.
    const completedLabel = settings.showCompletedTasks
        ? t("visibility.hide_completed_tasks")
        : t("visibility.show_completed_tasks");

    const eventsLabel = settings.showEvents
        ? t("visibility.hide_events")
        : t("visibility.show_events");

    const expandLabel = settings.expandEvents
        ? t("visibility.collapse_events")
        : t("visibility.expand_events");

    return (
        <Dropdown>
            {/* The trigger is the button itself in v3, so this carries `IconButton`'s classes
                rather than nesting one button inside another. */}
            <Dropdown.Trigger
                aria-label={t("actions.visibility_filter")}
                className={clsx("inline-flex size-[34px] items-center justify-center transition-colors cursor-pointer", ICON_BUTTON_WRAPPER_CLASS, ICON_BUTTON_CLASS)}
            >
                <Icon size={18} className={ICON_BUTTON_CLASS} />
            </Dropdown.Trigger>

            <Dropdown.Popover>
                <Dropdown.Menu aria-label={t("actions.visibility_filter")}>
                    <Dropdown.Item
                        id="completedTasks"
                        textValue={completedLabel}
                        onAction={() => updateSettings({ showCompletedTasks: !settings.showCompletedTasks })}
                    >
                        {settings.showCompletedTasks
                            ? <EyeOff size={16} className={MENU_ITEM_CLASS} />
                            : <Eye size={16} className={MENU_ITEM_CLASS} />}
                        <Label className={MENU_ITEM_CLASS}>{completedLabel}</Label>
                    </Dropdown.Item>

                    <Dropdown.Item
                        id="events"
                        textValue={eventsLabel}
                        onAction={() => updateSettings({ showEvents: !settings.showEvents })}
                    >
                        {settings.showEvents
                            ? <CalendarOff size={16} className={MENU_ITEM_CLASS} />
                            : <CalendarDays size={16} className={MENU_ITEM_CLASS} />}
                        <Label className={MENU_ITEM_CLASS}>{eventsLabel}</Label>
                    </Dropdown.Item>

                    {/* Only while there are events to expand. Offering to open out a calendar that
                        is switched off is offering to do nothing, and the user cannot tell which
                        of the two switches failed. */}
                    {settings.showEvents && (
                        <Dropdown.Item
                            id="expandEvents"
                            textValue={expandLabel}
                            onAction={() => updateSettings({ expandEvents: !settings.expandEvents })}
                        >
                            {settings.expandEvents
                                ? <ChevronsDownUp size={16} className={MENU_ITEM_CLASS} />
                                : <ChevronsUpDown size={16} className={MENU_ITEM_CLASS} />}
                            <Label className={MENU_ITEM_CLASS}>{expandLabel}</Label>
                        </Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown>
    )
}

export default VisibilityFilter
