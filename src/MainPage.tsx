import React, { useState } from 'react';
import TopBar from './components/MainPage/TopBar';
import MainContent from './components/MainContent/MainContent';

const MainPage: React.FC = () => {

  return (
    <div className="h-screen flex flex-col items-stretch">
      <header className="flex-none">
        <TopBar />
      </header>
      <div className="flex-grow overflow-auto">
        <MainContent /> {/* ✅ Envoi correct de la prop */}
      </div>
    </div>
  );
};

export default MainPage;
