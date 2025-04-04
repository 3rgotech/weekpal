import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";

interface TopBarProps { }

const TopBar: React.FC<TopBarProps> = () => {
  const { settings, updateSettings, openSettingsModal } = useSettings();

  return (
    <div className="top-bar flex items-center justify-between w-full p-4 bg-sky-600 dark:bg-sky-800 text-white">
      <div className="flex items-center gap-x-4">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-center gap-2">
        <CategoryFilter />
        <Menu icon="refresh" title="Refresh" />
        <Menu icon="print" title="Print" />
        <IconButton
          icon={settings.showCompletedTasks ? "eyeOff" : "eye"}
          onClick={() => {
            updateSettings({ showCompletedTasks: !settings.showCompletedTasks });
          }}
          size="md"
        />
        <IconButton
          icon="settings"
          onClick={openSettingsModal}
          size="md"
        />
        <Menu icon="user" title="User" />
      </div>
    </div>
  );
};

export default TopBar;
