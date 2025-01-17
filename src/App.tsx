import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import MainPage from "./MainPage";
import { DataProvider } from "./contexts/DataContext";

function App() {
  return (
    <DataProvider>
      <NextUIProvider>
        <MainPage />
        
      </NextUIProvider>
    </DataProvider>
  );
}

export default App;
