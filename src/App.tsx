import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/MainPage/TopBar";
import MainContent from "./MainContent";
// import Example from "./components/MainContent/test/Exemple";

function App() {
  return (
    <NextUIProvider>
      <DataProvider>
        <div className="h-screen flex flex-col items-stretch">
          <header className="flex-none">
            <TopBar />
          </header>
          <div className="flex-grow overflow-auto">
            <MainContent />
          </div>
        </div>
      </DataProvider>
      {/* <Example /> */}
    </NextUIProvider>
  );
}

export default App;
