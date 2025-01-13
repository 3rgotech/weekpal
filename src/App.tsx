import { NextUIProvider } from "@nextui-org/react";
import React from "react";
import MainPage from "./MainPage";

function App() {
  return (
    <NextUIProvider>
      <MainPage />
    </NextUIProvider>
  );
}

export default App;
