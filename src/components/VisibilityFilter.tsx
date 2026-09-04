import { Dropdown, Label } from '@heroui/react'
import React from 'react'
import { ICON_BUTTON_WRAPPER_CLASS, MENU_ITEM_CLASS } from '../utils/color';
import { ICON_BUTTON_CLASS } from '../utils/color';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { icons } from '../utils/icon';
import clsx from 'clsx';

const VisibilityFilter = () => {
    const { settings, updateSettings } = useSettings();
    const { t } = useTranslation();

    const Icon = icons.eye;

    // The item carried no `onAction` at all, so the wide board's only completed-tasks toggle did
    // nothing: it drew a checkmark and left the setting alone. The phone menu had been wired
    // correctly all along, which is why it worked there and not here.
    const label = settings.showCompletedTasks
        ? t("visibility.hide_completed_tasks")
        : t("visibility.show_completed_tasks");

    return (
        <Dropdown>
            {/* The trigger is the button itself in v3, so this carries `IconButton`'s classes
                rather than nesting one button inside another. */}
            <Dropdown.Trigger
                aria-label={t("actions.visibility_filter")}
                className={clsx("rounded-full transition-colors border p-2 cursor-pointer", ICON_BUTTON_WRAPPER_CLASS, ICON_BUTTON_CLASS)}
            >
                <Icon size={24} className={ICON_BUTTON_CLASS} />
            </Dropdown.Trigger>

            <Dropdown.Popover>
                <Dropdown.Menu aria-label={t("actions.visibility_filter")}>
                    <Dropdown.Item
                        id="completedTasks"
                        textValue={label}
                        onAction={() => updateSettings({ showCompletedTasks: !settings.showCompletedTasks })}
                    >
                        {settings.showCompletedTasks
                            ? <EyeOff size={16} className={MENU_ITEM_CLASS} />
                            : <Eye size={16} className={MENU_ITEM_CLASS} />}
                        <Label className={MENU_ITEM_CLASS}>{label}</Label>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown>
    )
}

export default VisibilityFilter
