import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button, ButtonGroup, Select, SelectItem } from "@heroui/react";
import { Language, Settings } from "../types";
import clsx from "clsx";
import { useLocalStorage } from "usehooks-ts";
import { DAY_HEADER_FORMATS, DEFAULT_SETTINGS, LANGUAGES, LANGUAGE_FLAGS, WEEK_HEADER_FORMATS } from "../utils/settings";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import "/node_modules/flag-icons/css/flag-icons.min.css";
import useDayJs from "../utils/dayjs";


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
  const [settings, setSettings] = useLocalStorage<Settings>("settings", DEFAULT_SETTINGS);
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const dayjs = useDayJs(settings.language);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
  }

  useEffect(() => {
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [settings.theme])

  const providedValues = {
    settings,
    updateSettings,
    openSettingsModal: onOpen,
    closeSettingsModal: onClose,
  }

  return (
    <SettingsContext.Provider value={providedValues}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Settings
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-3 gap-x-4 gap-y-8 items-center mb-4">
              <h3 className="text-base">Theme</h3>
              <ButtonGroup size="sm" className="col-span-2 justify-start">
                <Button
                  startContent={<SunIcon />}
                  className={clsx({ "bg-blue-500": settings.theme === "light" })}
                  onPress={() => updateSettings({ theme: "light" })}
                >
                  {/* TODO : Translation */}
                  Light
                </Button>
                <Button
                  startContent={<MoonIcon />}
                  className={clsx({ "bg-blue-500": settings.theme === "dark" })}
                  onPress={() => updateSettings({ theme: "dark" })}
                >
                  {/* TODO : Translation */}
                  Dark
                </Button>
                <Button
                  startContent={<MonitorIcon />}
                  className={clsx({ "bg-blue-500": settings.theme === "system" })}
                  onPress={() => updateSettings({ theme: "system" })}
                >
                  {/* TODO : Translation */}
                  System
                </Button>
              </ButtonGroup>
              <h3 className="text-base">Language</h3>
              <Select
                size="sm"
                selectedKeys={[settings.language]}
                startContent={<span className={`fi fi-${LANGUAGE_FLAGS[settings.language]}`} />}
                onSelectionChange={(keys) => updateSettings({ language: [...keys][0] as Language })}
                className="col-span-2"
              >
                {LANGUAGES.map(language => (
                  <SelectItem key={language} startContent={<span className={`fi fi-${LANGUAGE_FLAGS[language]}`} />}>
                    {/* TODO : Translation */}
                    {language}
                  </SelectItem>
                ))}
              </Select>
              <h3 className="text-base">Week header format</h3>
              <Select
                size="sm"
                selectedKeys={[settings.weekHeaderFormat]}
                onSelectionChange={(keys) => updateSettings({ weekHeaderFormat: `${[...keys][0]}` })}
                className="col-span-2"
                required
              >
                {WEEK_HEADER_FORMATS.map(format => (
                  <SelectItem key={format}>
                    {/* TODO : Translation */}
                    {dayjs().format(format).replace('[WEEK]', 'Week').replace('[OF]', 'of')}
                  </SelectItem>
                ))}
              </Select>
              <h3 className="text-base">Day header format</h3>
              <Select
                size="sm"
                selectedKeys={[settings.dayHeaderFormat]}
                onSelectionChange={(keys) => updateSettings({ dayHeaderFormat: `${[...keys][0]}` })}
                className="col-span-2"
                required
              >
                {DAY_HEADER_FORMATS.map(format => (
                  <SelectItem key={format}>
                    {/* TODO : Translation */}
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
