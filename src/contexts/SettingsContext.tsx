import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Button,
  ButtonGroup,
  Label,
  ListBox,
  Modal,
  Select,
  useOverlayState,
} from "@heroui/react";
import type { Key } from "react-aria-components";
import { Language, Settings, SubtaskDisplay } from "../types";
import clsx from "clsx";
import { useLocalStorage } from "usehooks-ts";
import {
  DAY_HEADER_FORMATS,
  DEFAULT_SETTINGS,
  LANGUAGES,
  LANGUAGE_FLAGS,
  SUBTASK_DISPLAYS,
  WEEK_HEADER_FORMATS,
  withDefaults,
} from "../utils/settings";
import { Weekday, WEEKDAYS, orderedWeekdays, toggleWorkingDay } from "../utils/week";
import { DAY_CAPACITIES } from "../utils/capacity";
import { Eye, EyeOff, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
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

  /** A date that falls on ISO weekday `day`, purely so the locale can name it. */
  const nameOf = (day: Weekday, format: string) =>
    dayjs().startOf("isoWeek").add(day - 1, "day").format(format);

  const providedValues = {
    settings,
    updateSettings,
    openSettingsModal: overlay.open,
    closeSettingsModal: overlay.close,
  };

  return (
    <SettingsContext.Provider value={providedValues}>
      {children}
      <Modal state={overlay}>
        <Modal.Backdrop variant="blur">
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header className="flex flex-col gap-1">
                <Modal.Heading>{t("settings.settings")}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 items-center mb-4">
              <h3 className="text-base dark:text-white">Theme</h3>
              <ButtonGroup size="sm" className="col-span-2 justify-start">
                <Button
                  variant="secondary"
                  className={clsx({ "bg-sky-500 text-white": settings.theme === "light" })}
                  onPress={() => updateSettings({ theme: "light" })}
                >
                  <SunIcon />
                  {t("theme.light")}
                </Button>
                <Button
                  variant="secondary"
                  className={clsx({ "bg-sky-500 text-white": settings.theme === "dark" })}
                  onPress={() => updateSettings({ theme: "dark" })}
                >
                  <MoonIcon />
                  {t("theme.dark")}
                </Button>
                <Button
                  variant="secondary"
                  className={clsx({
                    "bg-sky-500 text-white": settings.theme === "system",
                  })}
                  onPress={() => updateSettings({ theme: "system" })}
                >
                  <MonitorIcon />
                  {t("theme.system")}
                </Button>
              </ButtonGroup>
              <h3 className="text-base dark:text-white">
                {t("settings.language")}
              </h3>
              <Select
                value={settings.language}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({ language: String(key) as Language })
                }
                className="col-span-2"
              >
                <Select.Trigger>
                  {/* No separate flag here: `Select.Value` renders the chosen item's own
                      contents, flag included, and a second one beside it would be two. */}
                  <Select.Value className="flex items-center gap-2" />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {LANGUAGES.map((language) => (
                      <ListBox.Item
                        key={language}
                        id={language}
                        textValue={t(`language.${language}`)}
                      >
                        <span className={`fi fi-${LANGUAGE_FLAGS[language]}`} />
                        <Label>{t(`language.${language}`)}</Label>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.subtaskDisplay")}
              </h3>
              <Select
                value={settings.subtaskDisplay}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({
                    subtaskDisplay: String(key) as SubtaskDisplay,
                  })
                }
                className="col-span-2"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {SUBTASK_DISPLAYS.map((display) => (
                      <ListBox.Item
                        key={display}
                        id={display}
                        textValue={t(`subtaskDisplay.${display}`)}
                      >
                        <Label>{t(`subtaskDisplay.${display}`)}</Label>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.weekHeaderFormat")}
              </h3>
              <Select
                value={settings.weekHeaderFormat}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({ weekHeaderFormat: `${key}` })
                }
                className="col-span-2"
                isRequired
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {WEEK_HEADER_FORMATS.map((format) => {
                      const label = dayjs()
                        .format(format)
                        .replace("[WEEK]", t("misc.week"))
                        .replace("[OF]", t("misc.of"));

                      return (
                        <ListBox.Item key={format} id={format} textValue={label}>
                          <Label>{label}</Label>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                </Select.Popover>
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.weekStartsOn")}
              </h3>
              <Select
                value={`${settings.weekStartsOn}`}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({
                    weekStartsOn: parseInt(`${key}`, 10) as Weekday,
                  })
                }
                className="col-span-2"
                isRequired
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {WEEKDAYS.map((day) => (
                      <ListBox.Item
                        key={day}
                        id={`${day}`}
                        textValue={nameOf(day, "dddd")}
                      >
                        <Label>{nameOf(day, "dddd")}</Label>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.workingDays")}
              </h3>
              {/* Listed in this user's own week order, so the row reads the way the board does.
                  Buttons rather than a multi-select: seven options that are all on screen at once
                  are quicker to set than a popover, and this is the setting people revisit. */}
              <div className="col-span-2 flex gap-1">
                {orderedWeekdays(settings.weekStartsOn).map((day) => {
                  const isWorking = settings.workingDays.includes(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={isWorking}
                      aria-label={nameOf(day, "dddd")}
                      onClick={() => updateSettings({
                        workingDays: toggleWorkingDay(settings.workingDays, day),
                      })}
                      className={clsx(
                        "flex-1 py-1.5 rounded-md text-xs font-semibold uppercase transition-colors",
                        isWorking
                          ? "bg-sky-500 text-white"
                          : "bg-slate-200 text-slate-600 dark:bg-sky-900 dark:text-slate-300",
                      )}
                    >
                      {nameOf(day, "dd")}
                    </button>
                  );
                })}
              </div>
              <h3 className="text-base dark:text-white">
                {t("settings.nonWorkingDays")}
              </h3>
              <ButtonGroup size="sm" className="col-span-2 justify-start">
                <Button
                  variant="secondary"
                  className={clsx({ "bg-sky-500 text-white": settings.showNonWorkingDays })}
                  onPress={() => updateSettings({ showNonWorkingDays: true })}
                >
                  <Eye />
                  {t("actions.show")}
                </Button>
                <Button
                  variant="secondary"
                  className={clsx({ "bg-sky-500 text-white": !settings.showNonWorkingDays })}
                  onPress={() => updateSettings({ showNonWorkingDays: false })}
                >
                  <EyeOff />
                  {t("actions.hide")}
                </Button>
              </ButtonGroup>
              <h3 className="text-base dark:text-white">
                {t("settings.dayCapacity")}
              </h3>
              <Select
                value={`${settings.dayCapacity}`}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({
                    dayCapacity: parseInt(`${key}`, 10),
                  })
                }
                className="col-span-2"
                isRequired
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DAY_CAPACITIES.map((capacity) => {
                      const label = capacity === 0
                        ? t("settings.dayCapacityOff")
                        : t("settings.dayCapacityTasks", { limit: capacity });

                      return (
                        <ListBox.Item key={capacity} id={`${capacity}`} textValue={label}>
                          <Label>{label}</Label>
                        </ListBox.Item>
                      );
                    })}
                  </ListBox>
                </Select.Popover>
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.dayHeaderFormat")}
              </h3>
              <Select
                value={settings.dayHeaderFormat}
                onChange={(key: Key | null) =>
                  key !== null && updateSettings({ dayHeaderFormat: `${key}` })
                }
                className="col-span-2"
                isRequired
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {DAY_HEADER_FORMATS.map((format) => (
                      <ListBox.Item key={format} id={format} textValue={dayjs().format(format)}>
                        <Label>{dayjs().format(format)}</Label>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      </Modal>
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
