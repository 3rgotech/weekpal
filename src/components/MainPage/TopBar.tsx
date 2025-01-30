import React, { useState } from 'react';
import Logo from './Logo';
import WeekSelector from './WeekSelector';
import CategoryFilter from './CategoryFilter';
import Menu from './Menu';
import UserSvg from '../svg/UserSvg';
import PrintSvg from '../svg/PrintSvg';
import SyncSvg from '../svg/SyncSvg';
import SettingsSvg from '../svg/SettingsSvg';

const categories = ['all', 'Urgent', 'todo', 'when possible'];

interface TopBarProps {
  onCategoryChange: (category: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onCategoryChange }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    onCategoryChange(category);
  };

  return (
    <div className="top-bar flex items-center justify-between w-full p-4">
      <div className="flex items-center">
        <Logo />
        <WeekSelector />
      </div>
      <div className="flex items-center">
        <CategoryFilter categories={categories} onCategorySelect={handleCategorySelect} />
        <Menu {...SyncSvg} />
        <Menu {...PrintSvg} />
        <Menu {...SettingsSvg} />
        <Menu {...UserSvg} />
      </div>
    </div>
  );
};

export default TopBar;
