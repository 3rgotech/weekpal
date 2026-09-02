import { Dropdown, Label } from '@heroui/react'
import React from 'react'
import { ICON_BUTTON_WRAPPER_CLASS, TOOLTIP_CLASSES } from '../utils/color';
import { ICON_BUTTON_CLASS } from '../utils/color';
import { useSettings } from '../contexts/SettingsContext';
import IconButton from './IconButton';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { icons } from '../utils/icon';
import clsx from 'clsx';

const VisibilityFilter = () => {
    const { settings, updateSettings } = useSettings();
    const { t } = useTranslation();

    const Icon = icons.eye;

    return (
        <Dropdown>
            {/* The trigger is the button itself in v3, so this carries `IconButton`'s classes
                rather than nesting one button inside another. */}
            <Dropdown.Trigger
                aria-label={t("actions.visibility_filter")}
                className={clsx("rounded-full transition-colors border p-2", ICON_BUTTON_WRAPPER_CLASS, ICON_BUTTON_CLASS)}
            >
                <Icon size={24} className={ICON_BUTTON_CLASS} />
            </Dropdown.Trigger>

            <Dropdown.Popover>
                <Dropdown.Menu aria-label={t("actions.category_filter")}>
                    <Dropdown.Item id="completedTasks" textValue={t("actions.show_completed_tasks")}>
                        <Check />
                        <Label>{t("actions.show_completed_tasks")}</Label>
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown>
    )
}

export default VisibilityFilter