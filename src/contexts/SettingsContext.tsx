import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOverlayState } from "@heroui/react";
import { Settings } from "../types";
import { useLocalStorage } from "usehooks-ts";
import { DEFAULT_SETTINGS, withDefaults } from "../utils/settings";
import useDayJs from "../utils/dayjs";
import { useTranslation } from "react-i18next";
import AdapterFactory from "../adapter";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure } from "../utils/syncStatus";

interface SettingsContextProps {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  /**
   * Whether the server's copy has been merged in, or there was never a server to ask.
   *
   * The board renders from localStorage immediately, so "settings are available" and "settings
   * are the account's settings" are different moments. Anything that fires *once* off a stored
   * value — the first-run tour — has to wait for the second, or a fresh browser on an existing
   * account acts on a default the server is about to overwrite.
   */
  settingsLoaded: boolean;
  /**
   * Whether there is an account behind these settings, rather than one browser's localStorage.
   *
   * False on the demo board and on a local-only build. Anything that should happen once *per
   * person* rather than once per browser has to ask: the demo already explains itself in its own
   * dialog, and a first-run tour teaching somebody to plan their week is for somebody who has a
   * week here to plan.
   */
  settingsPersisted: boolean;
  /** The dialog's open state, for `SettingsModal` to render against. */
  settingsOverlay: ReturnType<typeof useOverlayState>;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(
  undefined
);

const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [stored, setSettings] = useLocalStorage<Settings>(
    "settings",
    DEFAULT_SETTINGS
  );

  // What the app reads is never the raw blob: a browser that last saved before a field existed
  // has none of it, and a working-day set out of a hand-edited localStorage would render a board
  // with no columns.
  const settings = useMemo(() => withDefaults(stored), [stored]);

  const overlay = useOverlayState();
  const dayjs = useDayJs(settings.language);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Built here rather than passed down: SettingsProvider sits above DataProvider,
  // where the other adapters are created.
  const adapter = useMemo(() => AdapterFactory.createAdapters().settingsAdapter, []);

  // Guards the first server read from racing a change the user makes while it is
  // in flight — without it, opening the modal and flipping a switch during boot
  // would be overwritten by the response.
  const hasLocalEdit = useRef(false);

  /**
   * Settings are local-first, like everything else here: localStorage answers
   * every read, so the board renders correctly offline and before the network
   * responds. The server copy is pulled once on boot and merged in.
   */
  useEffect(() => {
    if (!adapter) {
      // A demo or local-only board. There is no server copy coming, so the local one is already
      // the final answer and nothing should wait for a response that will never arrive.
      setSettingsLoaded(true);

      return;
    }

    let cancelled = false;

    adapter
      .get()
      .then((remote) => {
        if (!cancelled && !hasLocalEdit.current) {
          setSettings((previous) => ({ ...previous, ...remote }));
        }
      })
      .catch((error) => {
        // Not fatal: the local copy stands. Reported so an expired session shows
        // up in the sync indicator rather than only in the console.
        reportSyncFailure(classifyFailure(error));
        console.error("Could not load settings from the server:", error);
      })
      .finally(() => {
        // Settled, not succeeded. Offline, the local copy is the best answer there is, and a
        // board that waited for a response it is never going to get would hold back the tour
        // forever rather than run it on what it knows.
        if (!cancelled) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    hasLocalEdit.current = true;

    // Applied locally first so the UI never waits on the network, then pushed.
    setSettings((prevSettings) => ({ ...prevSettings, ...newSettings }));

    adapter
      ?.update(newSettings)
      .then((stored) => setSettings((previous) => ({ ...previous, ...stored })))
      .catch((error) => {
        reportSyncFailure(classifyFailure(error));
        console.error("Could not save settings to the server:", error);
      });
  };

  useEffect(() => {
    const isDark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [settings.theme]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);

  const providedValues = {
    settings,
    updateSettings,
    openSettingsModal: overlay.open,
    closeSettingsModal: overlay.close,
    settingsLoaded,
    settingsPersisted: adapter !== null,
    // Handed out rather than used here: the modal lists the user's categories, and this provider
    // sits above the one that holds them — `SettingsProvider` wraps `CalendarProvider`, which
    // wraps `DataProvider`, and that order is fixed because each reads the one above it. So the
    // dialog is rendered by `SettingsModal` further down the tree, and only its open state
    // belongs here.
    settingsOverlay: overlay,
  };

  return (
    <SettingsContext.Provider value={providedValues}>
      {children}
    </SettingsContext.Provider>
  );
};

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export { SettingsContext, SettingsProvider, useSettings };
