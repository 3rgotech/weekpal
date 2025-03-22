import React, { useEffect, useState } from "react";
import { HeroUIProvider } from "@heroui/react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
import CannotLoadTheApp from "./CannotLoadTheApp";
import { CalendarProvider } from "./contexts/CalendarContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import './i18n';
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
    <HeroUIProvider>
      {!indexedDBAvailable ? (
        <CannotLoadTheApp reason="indexeddb_unavailable" />
      ) : (
        <SettingsProvider>
          <CalendarProvider>
            <DataProvider>
              <TaskModalProvider>
                <div className="h-screen flex flex-col items-stretch overflow-hidden bg-slate-200 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  <header className="flex-none">
                    <TopBar />
                  </header>
                  <div className="flex-grow overflow-hidden">
                    <MainContent />
                  </div>
                </div>
              </TaskModalProvider>
            </DataProvider>
          </CalendarProvider>
        </SettingsProvider>
      )}
    </HeroUIProvider>
  );
}

export default App;
