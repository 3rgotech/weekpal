import { NextUIProvider } from "@nextui-org/react";
import React, { useEffect, useState } from "react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
import CannotLoadTheApp from "./CannotLoadTheApp";
import { CalendarProvider } from "./contexts/CalendarContext";
// import Example from "./components/MainContent/test/Exemple";

function App() {
  const [indexedDBAvailable, setIndexedDBAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.indexedDB) {
      setIndexedDBAvailable(false);
    }
    setLoading(false);
  }, []);

  if (loading) {
    // TODO : add a better loader
    return <div>Loading...</div>
  }

  return (
    <NextUIProvider>
      {!indexedDBAvailable ? (
        <CannotLoadTheApp reason="indexeddb_unavailable" />
      ) : (
        <CalendarProvider>
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
        </CalendarProvider>
      )}
    </NextUIProvider>
  );
}

export default App;
