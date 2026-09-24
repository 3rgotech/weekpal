import React, { useEffect, useMemo, useState } from "react";
import { DataProvider } from "./contexts/DataContext";
import TopBar from "./components/TopBar";
import MainContent from "./MainContent";
import { TaskModalProvider } from "./contexts/TaskModalContext";
import { ShortcutsProvider } from "./contexts/ShortcutsContext";
import { ChangelogProvider } from "./contexts/ChangelogContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import CannotLoadTheApp from "./CannotLoadTheApp";
import { CalendarProvider } from "./contexts/CalendarContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AccountProvider } from "./contexts/AccountContext";
import SettingsModal from "./components/SettingsModal";
import LimitReachedModal from "./components/LimitReachedModal";
import EscapeHatch from "./components/EscapeHatch";
import Ambient from "./components/Ambient";
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
import { startTabLeadership } from "./utils/tabLeader";
import { IChangelogAdapter, IFeedbackAdapter, IInsightsAdapter, IShareAdapter } from "./types";
import { configureBoardToken } from "./utils/boardToken";
import { configureBuildFence } from "./utils/buildFence";
import { ProTeaserProvider } from "./contexts/ProTeaserContext";
import ProTeaserBar from "./components/ProTeaserBar";

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

    // Before any adapter is built: the adapters read the token per request rather than baking it
    // in, and the first read happens as soon as a store pulls.
    configureBoardToken(env.apiKey, env.tokenUrl);
    configureBuildFence(env.buildId);

    // Claim the sync lock here too, and for the same reason: `SyncService` is built by the first
    // store a child creates, and a tab that has not decided whether it leads by then would flush
    // its opening writes regardless of how many other tabs are already open.
    startTabLeadership();
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
  const [shareAdapter, setShareAdapter] = useState<IShareAdapter | null>(null);
  const [insightsAdapter, setInsightsAdapter] = useState<IInsightsAdapter | null>(null);
  const [feedbackAdapter, setFeedbackAdapter] = useState<IFeedbackAdapter | null>(null);
  const [changelogAdapter, setChangelogAdapter] = useState<IChangelogAdapter | null>(null);
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
      shareAdapter,
      insightsAdapter,
      feedbackAdapter,
      changelogAdapter,
    } = AdapterFactory.createAdapters();
    setTaskAdapter(taskAdapter);
    setCategoryAdapter(categoryAdapter);
    setNoteAdapter(noteAdapter);
    setHistoryAdapter(historyAdapter);
    setProjectAdapter(projectAdapter);
    setShareAdapter(shareAdapter);
    setInsightsAdapter(insightsAdapter);
    setFeedbackAdapter(feedbackAdapter);
    setChangelogAdapter(changelogAdapter);

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
          {/* Directly inside the settings, which is all it reads, and outside everything that
              lets itself in on load — the leftover review and the release notes both stand down
              while the tour has the floor. */}
          <OnboardingProvider>
          <CalendarProvider>
            <DataProvider
              taskAdapter={taskAdapter}
              categoryAdapter={categoryAdapter}
              noteAdapter={noteAdapter}
              historyAdapter={historyAdapter}
              projectAdapter={projectAdapter}
              shareAdapter={shareAdapter}
              insightsAdapter={insightsAdapter}
              feedbackAdapter={feedbackAdapter}
              changelogAdapter={changelogAdapter}
            >
              <TaskModalProvider>
                {/* Inside the task modal's provider: the keys stand down while it is open, and
                    `n` is what opens it. */}
                {/* Above the shortcuts, which is where the Leftover Review lives: closing the
                    review is what may raise the one Pro teaser. */}
                <ProTeaserProvider proUrl={getEnvConfig().proUrl}>
                <ShortcutsProvider>
                  {/* Inside the shortcuts, not outside: the release notes give way to the
                      leftover review, which lets itself in on the same load and whose open state
                      lives in that provider. The Settings dialog is inside this one because it
                      carries the link that opens the full history. */}
                  <ChangelogProvider>
                  <SettingsModal />
                  <LimitReachedModal />
                  <EscapeHatch />
                  {/* Renders nothing: the tab title and the favicon are the whole ambient
                      channel, and they are the only way the board reaches somebody who is
                      looking at a different tab. */}
                  <Ambient />
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

                    {/* The one Pro teaser, after a review — never inside it. */}
                    <ProTeaserBar />

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
                </ChangelogProvider>
                </ShortcutsProvider>
                </ProTeaserProvider>
              </TaskModalProvider>
            </DataProvider>
          </CalendarProvider>
          </OnboardingProvider>
        </SettingsProvider>
        </AccountProvider>
      )
  );
}

export default App;
