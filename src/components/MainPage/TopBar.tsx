import React, { useState } from 'react';
import Logo from './Logo';
import WeekSelector from './WeekSelector';
import CategoryFilter from './CategoryFilter';
import Menu from './Menu';
import UserSvg from '../svg/UserSvg';
import PrintSvg from '../svg/PrintSvg';
import SyncSvg from '../svg/SyncSvg';
import SettingsSvg from '../svg/SettingsSvg';

interface TopBarProps {
}

const TopBar: React.FC<TopBarProps> = () => {

  return (
    <div className="top-bar flex items-center justify-between w-full p-4">
      <div className="flex items-center">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-center">
        <CategoryFilter />
        <Menu {...SyncSvg} />
        <Menu {...PrintSvg} />
        <Menu {...SettingsSvg} />
        <Menu {...UserSvg} />
      </div>
    </div>
  );
};

export default TopBar;
