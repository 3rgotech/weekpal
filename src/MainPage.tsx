import React from "react";
import TopBar from "./components/MainPage/TopBar";
import MainContent from "./components/MainContent/MainContent";

const MainPage = () => {
  return (
    <div>
      <header className="flex flex-col items-center">
        <TopBar />
      </header>
      <div>
      <MainContent />
      </div>
      
    </div>
  );
};

export default MainPage;
