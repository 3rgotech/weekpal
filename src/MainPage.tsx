import React, { useState } from 'react';
import TopBar from './components/MainPage/TopBar';
import MainContent from './components/MainContent/MainContent';

const MainPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  return (
    <div className="h-screen flex flex-col items-stretch">
      <header className="flex-none">
        <TopBar onCategoryChange={setSelectedCategory} />
      </header>
      <div className="flex-grow overflow-auto">
        <MainContent selectedCategory={selectedCategory} /> {/* ✅ Envoi correct de la prop */}
      </div>
    </div>
  );
};

export default MainPage;
