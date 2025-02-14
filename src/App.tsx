import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
// import Example from "./components/MainContent/test/Exemple";

function App() {
  return (
    <NextUIProvider>
      <DataProvider>
        <TaskModalProvider>
          <div className="h-screen flex flex-col items-stretch">
            <header className="flex-none">
              <TopBar />
            </header>
            <div className="flex-grow overflow-auto">
              <MainContent />
            </div>
          </div>
        </TaskModalProvider>
      </DataProvider>
      {/* <Example /> */}
    </NextUIProvider>
  );
}

export default App;
