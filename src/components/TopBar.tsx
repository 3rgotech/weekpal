import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@heroui/react";
import { ICON_BUTTON_CLASS, ICON_BUTTON_WRAPPER_CLASS, TOOLTIP_CLASSES } from "../utils/color";
import SyncStatusIndicator from "./SyncStatusIndicator";
import VisibilityFilter from "./VisibilityFilter";

interface TopBarProps { }

const TopBar: React.FC<TopBarProps> = () => {
  const { openSettingsModal } = useSettings();
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-sky-950">
      <div className="flex items-stretch">
        <Logo />
        <WeekSelector />
        <div className="flex items-center ml-4">
          <SyncStatusIndicator />
        </div>
      </div>
      <div className="flex items-stretch">
        <Tooltip content={t("actions.category_filter")} placement="left" showArrow classNames={TOOLTIP_CLASSES}>
          <div className="flex items-stretch justify-center h-16 border-l border-slate-300 dark:border-sky-900">
            <CategoryFilter />
          </div>
        </Tooltip>
        {/* <Menu icon="refresh" title="Refresh" /> */}
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="print"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.print")}
            onClick={() => {
              console.log("print");
            }}
            size="md"
          />
        </div>
        <Tooltip content={t("actions.visibility_filter")} placement="bottom" showArrow classNames={TOOLTIP_CLASSES}>
          <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
            <VisibilityFilter />
          </div>
        </Tooltip>
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="settings"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.settings")}
            onClick={openSettingsModal}
            size="md"
          />
        </div>
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="user"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.user_menu")}
            onClick={() => {
              console.log("user");
            }}
            size="md"
          />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
