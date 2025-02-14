import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";
import { Printer, RefreshCw, Settings, User } from "lucide-react";

interface TopBarProps {}

const TopBar: React.FC<TopBarProps> = () => {
  return (
    <div className="top-bar flex items-center justify-between w-full p-4">
      <div className="flex items-center">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-center gap-2">
        <CategoryFilter />
        <Menu icon={<RefreshCw />} title="Refresh" />
        <Menu icon={<Printer />} title="Print" />
        <Menu icon={<Settings />} title="Settings" />
        <Menu icon={<User />} title="User" />
      </div>
    </div>
  );
};

export default TopBar;
