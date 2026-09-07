import React, { useEffect, useMemo, useState } from "react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import CannotLoadTheApp from "./CannotLoadTheApp";
import { CalendarProvider } from "./contexts/CalendarContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AccountProvider } from "./contexts/AccountContext";
import SettingsModal from "./components/SettingsModal";
import "./i18n";
import SplashScreen from "./components/SplashScreen";
import DemoModal from "./components/DemoModal";
import MobileBoard from "./components/MobileBoard";
import MobileTopBar from "./components/MobileTopBar";
import CategoryFocusBar from "./components/CategoryFocusBar";
import PrintSheet from "./components/PrintSheet";
import UpdateBar from "./components/UpdateBar";
import { useVerticalLayout } from "./utils/layout";
import { isInstalled } from "./utils/install";
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
  // Which board renders, not merely how it looks: the wide one mounts a drag-and-drop context
  // that the narrow one has no use for, and that choice cannot be made in CSS.
  const vertical = useVerticalLayout();

  // During render, not in an effect: child effects run before the parent's, so configuring this
  // in `useEffect` left `SyncStatusIndicator` probing before it knew where the API was — and
  // silently treating the board as reachable because no URL was set.
  useMemo(() => {
    const env = getEnvConfig();
    configureConnectivity({ baseApiUrl: env.baseApiUrl, dataSource: env.dataSource });
  }, []);

  const [indexedDBAvailable, setIndexedDBAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  /*
   * The splash is for the installed app only.
   *
   * Launching from a home-screen icon should look like an app starting — the platform shows its
   * own splash from the manifest first, and this covers the gap between that disappearing and the
   * board being ready. In a browser tab there is no gap to cover and it would just be an
   * interstitial between the visitor and the thing they asked for.
   */
  const [splashScreen, setSplashScreen] = useState(() => isInstalled());
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

    // The mark's own sequence is 900ms; this leaves a beat on the finished state so the last
    // thing to appear is not also the last thing to be seen.
    const timer = setTimeout(() => {
      setMinSplashTimeElapsed(true);
    }, 1300);

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
      !indexedDBAvailable ? (
        <CannotLoadTheApp reason="indexeddb_unavailable" />
      ) : (
        <AccountProvider>
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
                {/* Inside the task modal's provider: the keys stand down while it is open, and
                    `n` is what opens it. */}
                <ShortcutsProvider>
                  <SettingsModal />
                {splashScreen ? (
                  <SplashScreen />
                ) : (
                  <div className="h-screen flex flex-col items-stretch overflow-hidden bg-white dark:bg-slate-800 text-slate-800 dark:text-white print:hidden">
                    <header className="flex-none">
                      {/* The review the inbox button opens is state in `ShortcutsProvider`
                          now — the same state `i` toggles — so neither bar is handed a callback
                          for it any more. */}
                      {vertical ? <MobileTopBar /> : <TopBar />}
                    </header>

                    {/* Under the bar, above the board: it takes its own space rather than
                        floating, so it can never sit on top of the day pills. */}
                    <UpdateBar />

                    {/* Same row treatment, and only present while a category has focus: it is
                        the only way back out, so it belongs on both boards. */}
                    <CategoryFocusBar />

                    <div className="grow overflow-hidden">
                      {vertical ? <MobileBoard /> : <MainContent />}
                    </div>
                    <DemoModal
                      isOpen={showDemoModal}
                      onClose={() => setShowDemoModal(false)}
                    />
                  </div>
                )}

                {/* Outside the shell above, which is hidden on paper. Always mounted so ⌘P works
                    as well as the toolbar button. */}
                <PrintSheet />
                </ShortcutsProvider>
              </TaskModalProvider>
            </DataProvider>
          </CalendarProvider>
        </SettingsProvider>
        </AccountProvider>
      )
  );
}

export default App;
