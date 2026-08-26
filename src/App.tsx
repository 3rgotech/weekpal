import React, { useEffect, useMemo, useState } from "react";
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
import DemoModal from "./components/DemoModal";
import LeftoverReview from "./components/LeftoverReview";
import AdapterFactory from "./adapter";
import { ITaskAdapter, ICategoryAdapter, INoteAdapter, IHistoryAdapter, IProjectAdapter } from "./types";
import { getEnvConfig } from "./utils/env";
import { configureConnectivity } from "./utils/connectivity";

// Extend Window interface to include API_URL
declare global {
  interface Window {
    API_URL?: string;
  }
}

function App() {
  // During render, not in an effect: child effects run before the parent's, so configuring this
  // in `useEffect` left `SyncStatusIndicator` probing before it knew where the API was — and
  // silently treating the board as reachable because no URL was set.
  useMemo(() => {
    const env = getEnvConfig();
    configureConnectivity({ baseApiUrl: env.baseApiUrl, dataSource: env.dataSource });
  }, []);

  const [indexedDBAvailable, setIndexedDBAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  // TODO : enable splash screen in production
  const [splashScreen, setSplashScreen] = useState(false);
  const [minSplashTimeElapsed, setMinSplashTimeElapsed] = useState(false);
  const [taskAdapter, setTaskAdapter] = useState<ITaskAdapter | null>(null);
  const [categoryAdapter, setCategoryAdapter] =
    useState<ICategoryAdapter | null>(null);
  const [noteAdapter, setNoteAdapter] = useState<INoteAdapter | null>(null);
  const [historyAdapter, setHistoryAdapter] = useState<IHistoryAdapter | null>(
    null
  );
  const [projectAdapter, setProjectAdapter] = useState<IProjectAdapter | null>(
    null
  );
  const [showDemoModal, setShowDemoModal] = useState(false);
  // Held here rather than inside the review: the button that reopens it lives in the top bar,
  // which is a sibling, and the review itself needs the data provider to look for leftovers.
  const [showLeftoverReview, setShowLeftoverReview] = useState(false);

  useEffect(() => {
    if (!window.indexedDB) {
      setIndexedDBAvailable(false);
    }

    // Create adapters from environment configuration
    const {
      taskAdapter,
      categoryAdapter,
      noteAdapter,
      historyAdapter,
      projectAdapter,
    } = AdapterFactory.createAdapters();
    setTaskAdapter(taskAdapter);
    setCategoryAdapter(categoryAdapter);
    setNoteAdapter(noteAdapter);
    setHistoryAdapter(historyAdapter);
    setProjectAdapter(projectAdapter);

    // Check if we're in demo mode
    const { dataSource } = getEnvConfig();
    if (dataSource === "demo") {
      setShowDemoModal(true);
    }

    // Set loading to false
    setLoading(false);

    // Set minimum splash screen time
    const timer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 3000);

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
            <DataProvider
              taskAdapter={taskAdapter}
              categoryAdapter={categoryAdapter}
              noteAdapter={noteAdapter}
              historyAdapter={historyAdapter}
              projectAdapter={projectAdapter}
            >
              <TaskModalProvider>
                {splashScreen ? (
                  <SplashScreen />
                ) : (
                  <div className="h-screen flex flex-col items-stretch overflow-hidden bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                    <header className="flex-none">
                      <TopBar onReviewLeftovers={() => setShowLeftoverReview(true)} />
                    </header>
                    <div className="flex-grow overflow-hidden">
                      <MainContent />
                    </div>
                    <DemoModal
                      isOpen={showDemoModal}
                      onClose={() => setShowDemoModal(false)}
                    />
                    <LeftoverReview
                      isOpen={showLeftoverReview}
                      onOpenChange={setShowLeftoverReview}
                    />
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
