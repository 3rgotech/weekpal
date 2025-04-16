import React, { useEffect, useState } from "react";
import { HeroUIProvider } from "@heroui/react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
import CannotLoadTheApp from "./CannotLoadTheApp";
import { CalendarProvider } from "./contexts/CalendarContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import "./i18n";
import SplashScreen from "./components/SplashScreen";
// import Example from "./components/MainContent/test/Exemple";

function App() {
  const [indexedDBAvailable, setIndexedDBAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  // TODO : enable splash screen in production
  const [splashScreen, setSplashScreen] = useState(false);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);

  useEffect(() => {
    if (!window.indexedDB) {
      setIndexedDBAvailable(false);
    }

    // TODO : add API call
    // Set loading to false
    setLoading(false);

    // Set minimum splash screen time
    const timer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only hide splash screen when both conditions are met:
    // 1. Minimum time has elapsed (2000ms)
    // 2. Loading is complete
    if (minSplashTimeElapsed && !loading) {
      setSplashScreen(false);
    }
  }, [minSplashTimeElapsed, loading]);

  return (
    <HeroUIProvider>
      {!indexedDBAvailable ? (
        <CannotLoadTheApp reason="indexeddb_unavailable" />
      ) : (
        <SettingsProvider>
          <CalendarProvider>
            <DataProvider>
              <TaskModalProvider>
                {splashScreen ? (
                  <SplashScreen />
                ) : (
                  <div className="h-screen flex flex-col items-stretch overflow-hidden bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                    <header className="flex-none">
                      <TopBar />
                    </header>
                    <div className="flex-grow overflow-hidden">
                      <MainContent />
                    </div>
                  </div>
                )}
              </TaskModalProvider>
            </DataProvider>
          </CalendarProvider>
        </SettingsProvider>
      )}
    </HeroUIProvider>
  );
}

export default App;
