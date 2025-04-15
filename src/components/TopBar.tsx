import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";

interface TopBarProps {}

const TopBar: React.FC<TopBarProps> = () => {
  const { settings, updateSettings, openSettingsModal } = useSettings();

  const iconClass =
    "text-sky-950 dark:text-white group-hover:text-white group-hover:dark:text-sky-950";
  const wrapperClass =
    "border-slate-300 dark:border-sky-900 hover:bg-sky-950 hover:dark:bg-white group";
  return (
    <div className="top-bar flex items-center justify-between w-full bg-slate-100 dark:bg-sky-950">
      <div className="flex items-stretch">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-stretch">
        <div className="flex items-stretch justify-center h-16 border-l border-slate-300 dark:border-sky-900">
          <CategoryFilter />
        </div>
        {/* <Menu icon="refresh" title="Refresh" /> */}
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="print"
            iconClass={iconClass}
            wrapperClass={wrapperClass}
            onClick={() => {
              console.log("print");
            }}
            size="md"
          />
        </div>
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon={settings.showCompletedTasks ? "eyeOff" : "eye"}
            iconClass={iconClass}
            wrapperClass={wrapperClass}
            onClick={() => {
              updateSettings({
                showCompletedTasks: !settings.showCompletedTasks,
              });
            }}
            size="md"
          />
        </div>
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="settings"
            iconClass={iconClass}
            wrapperClass={wrapperClass}
            onClick={openSettingsModal}
            size="md"
          />
        </div>
        <div className="flex items-center justify-center size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="user"
            iconClass={iconClass}
            wrapperClass={wrapperClass}
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
