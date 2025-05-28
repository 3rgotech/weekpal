import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Tooltip } from '@heroui/react'
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
            <DropdownTrigger>
                <IconButton
                    icon="eye"
                    iconClass={ICON_BUTTON_CLASS}
                    wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
                    size="md"
                />
            </DropdownTrigger>

            <DropdownMenu aria-label={t("actions.category_filter")}>
                <DropdownItem key="completedTasks" startContent={<Check />} className="dark:text-white">
                    {t("actions.show_completed_tasks")}
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    )
}

export default VisibilityFilter