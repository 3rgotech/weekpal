import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import MainPage from "./MainPage";
import { DataProvider } from "./contexts/DataContext";

function App() {
  return (
    <NextUIProvider>
      <DataProvider>
        <MainPage />
      </DataProvider> 
    </NextUIProvider>
  );
}

export default App;
