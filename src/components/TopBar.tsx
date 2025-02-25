import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";

interface TopBarProps { }

const TopBar: React.FC<TopBarProps> = () => {
  return (
    <div className="top-bar flex items-center justify-between w-full p-4">
      <div className="flex items-center">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-center gap-2">
        <CategoryFilter />
        <Menu icon="refresh" title="Refresh" />
        <Menu icon="print" title="Print" />
        <Menu icon="settings" title="Settings" />
        <Menu icon="user" title="User" />
      </div>
    </div>
  );
};

export default TopBar;
