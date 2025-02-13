import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import MainPage from "./MainPage";
import { DataProvider } from "./contexts/DataContext";
// import Example from "./components/MainContent/test/Exemple";

function App() {
  return (
    <NextUIProvider>
      <DataProvider>
        <MainPage />
      </DataProvider>
      {/* <Example /> */}
    </NextUIProvider>
  );
}

export default App;
