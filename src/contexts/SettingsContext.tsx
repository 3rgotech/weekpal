import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  useDisclosure,
} from "@heroui/modal";
import { Button, ButtonGroup, Select, SelectItem } from "@heroui/react";
import { Language, Settings } from "../types";
import clsx from "clsx";
import { useLocalStorage } from "usehooks-ts";
import {
  DAY_HEADER_FORMATS,
  DEFAULT_SETTINGS,
  LANGUAGES,
  LANGUAGE_FLAGS,
  WEEK_HEADER_FORMATS,
} from "../utils/settings";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import "/node_modules/flag-icons/css/flag-icons.min.css";
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
  const [settings, setSettings] = useLocalStorage<Settings>(
    "settings",
    DEFAULT_SETTINGS
  );
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
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

  const providedValues = {
    settings,
    updateSettings,
    openSettingsModal: onOpen,
    closeSettingsModal: onClose,
  };

  return (
    <SettingsContext.Provider value={providedValues}>
      {children}
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="2xl"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1 dark:text-white">
            {t("settings.settings")}
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 items-center mb-4">
              <h3 className="text-base dark:text-white">Theme</h3>
              <ButtonGroup size="sm" className="col-span-2 justify-start">
                <Button
                  startContent={<SunIcon />}
                  className={clsx({ "bg-sky-500": settings.theme === "light" })}
                  onPress={() => updateSettings({ theme: "light" })}
                >
                  {t("theme.light")}
                </Button>
                <Button
                  startContent={<MoonIcon />}
                  className={clsx({ "bg-sky-500": settings.theme === "dark" })}
                  onPress={() => updateSettings({ theme: "dark" })}
                >
                  {t("theme.dark")}
                </Button>
                <Button
                  startContent={<MonitorIcon />}
                  className={clsx({
                    "bg-sky-500": settings.theme === "system",
                  })}
                  onPress={() => updateSettings({ theme: "system" })}
                >
                  {t("theme.system")}
                </Button>
              </ButtonGroup>
              <h3 className="text-base dark:text-white">
                {t("settings.language")}
              </h3>
              <Select
                size="sm"
                selectedKeys={[settings.language]}
                startContent={
                  <span
                    className={`fi fi-${LANGUAGE_FLAGS[settings.language]}`}
                  />
                }
                onSelectionChange={(keys) =>
                  updateSettings({ language: [...keys][0] as Language })
                }
                className="col-span-2"
              >
                {LANGUAGES.map((language) => (
                  <SelectItem
                    key={language}
                    startContent={
                      <span className={`fi fi-${LANGUAGE_FLAGS[language]}`} />
                    }
                    className="dark:text-white"
                  >
                    {t(`language.${language}`)}
                  </SelectItem>
                ))}
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.weekHeaderFormat")}
              </h3>
              <Select
                size="sm"
                selectedKeys={[settings.weekHeaderFormat]}
                onSelectionChange={(keys) =>
                  updateSettings({ weekHeaderFormat: `${[...keys][0]}` })
                }
                className="col-span-2"
                required
              >
                {WEEK_HEADER_FORMATS.map((format) => (
                  <SelectItem key={format} className="dark:text-white">
                    {dayjs()
                      .format(format)
                      .replace("[WEEK]", t("misc.week"))
                      .replace("[OF]", t("misc.of"))}
                  </SelectItem>
                ))}
              </Select>
              <h3 className="text-base dark:text-white">
                {t("settings.dayHeaderFormat")}
              </h3>
              <Select
                size="sm"
                selectedKeys={[settings.dayHeaderFormat]}
                onSelectionChange={(keys) =>
                  updateSettings({ dayHeaderFormat: `${[...keys][0]}` })
                }
                className="col-span-2"
                required
              >
                {DAY_HEADER_FORMATS.map((format) => (
                  <SelectItem key={format} className="dark:text-white">
                    {dayjs().format(format)}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
        </ModalContent>
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
