import React from 'react';
import Logo from './Logo';
import WeekSelector from './WeekSelector';
import CategoryFilter from './CategoryFilter';
import Menu from './Menu';
import UserSvg from '../svg/UserSvg';
import PrintSvg from '../svg/PrintSvg';
import SyncSvg from '../svg/SyncSvg';
import SettingsSvg from '../svg/SettingsSvg';

const categories = ['Technology', 'Health', 'Business', 'Education']; // Exemple de catégories

const handleCategorySelect = (category: string) => {
    console.log('Category selected:', category); // Logique de gestion de la catégorie sélectionnée
};

const TopBar: React.FC = () => {
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
