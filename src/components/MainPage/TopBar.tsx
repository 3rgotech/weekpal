import React from 'react';
import Logo from './Logo';
import WeekSelector from './WeekSelector';
import CategoryFilter from './CategoryFilter';
import Menu from './Menu';
const TopBar: React.FC = () => {
    return (
        <div className="top-bar flex items-center justify-between w-full p-4">
            <div className="flex items-center">
            <Logo />
            <WeekSelector />
            </div>
            <div className="flex items-center">
            
            {/* <CategoryFilter /> */}
            <Menu />
            </div>
        </div>
    );
};

export default TopBar;