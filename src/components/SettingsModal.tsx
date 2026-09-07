import React from "react";
import {
    Button,
    ButtonGroup,
    Label,
    ListBox,
    Modal,
    Select,
    Tabs,
} from "@heroui/react";
import type { Key } from "react-aria-components";
import clsx from "clsx";
import { Eye, EyeOff, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Language, SubtaskDisplay } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { useData } from "../contexts/DataContext";
import useDayJs from "../utils/dayjs";
import {
    DAY_HEADER_FORMATS,
    LANGUAGES,
    LANGUAGE_FLAGS,
    SUBTASK_DISPLAYS,
    WEEK_HEADER_FORMATS,
} from "../utils/settings";
import { Weekday, WEEKDAYS, orderedWeekdays, toggleWorkingDay } from "../utils/week";
import { DAY_CAPACITIES, SOMEDAY_LIMITS, THIS_WEEK_LIMITS, toggleCountedCategory } from "../utils/capacity";
import { NO_CATEGORY_KEY } from "../utils/categories";
import ImportPanel from "./ImportPanel";

/**
 * The settings dialog.
 *
 * Three tabs rather than one long column: the board's settings outgrew a single scroll once the
 * week became configurable and the limits arrived, and a dialog you have to scroll to find the
 * control you came for is one you stop opening.
 *
 * Rendered here rather than by `SettingsProvider`, which owns the values it edits: the
 * counted-categories picker needs the user's categories, and that provider sits above the one
 * holding them. The order is fixed — settings, then calendar, then data, each reading the one
 * above — so the dialog moved down instead, and only its open state stayed behind.
 */
const SettingsModal: React.FC = () => {
    const { t } = useTranslation();
    const { settings, updateSettings, settingsOverlay: overlay } = useSettings();
    const { categories } = useData();
    const dayjs = useDayJs(settings.language);

    /** A date that falls on ISO weekday `day`, purely so the locale can name it. */
    const nameOf = (day: Weekday, format: string) =>
        dayjs().startOf("isoWeek").add(day - 1, "day").format(format);

    return (
        <Modal state={overlay}>
            <Modal.Backdrop variant="blur">
                <Modal.Container size="lg">
                    <Modal.Dialog>
                        <Modal.Header className="flex flex-col gap-1">
                            <Modal.Heading>{t("settings.settings")}</Modal.Heading>
                        </Modal.Header>
                        <Modal.Body>
                            {/* No save button, and deliberately none: every control writes as it
                                is changed — to localStorage first, then to the server — so a tab
                                can be left at any moment without losing anything, and closing the
                                dialog is not a decision. */}
                            {/* The default variant, not `secondary`: secondary is flat, and three
                                flat labels spread across a wide dialog read as column headings
                                rather than as something to press. HeroUI's own `Tabs.Indicator`
                                throws outside a `SharedElementTransition`, so the selected pill
                                is drawn from `index.css` instead. */}
                            <Tabs aria-label={t("settings.settings")}>
                                <Tabs.List aria-label={t("settings.settings")}>
                                    <Tabs.Tab id="appearance">{t("settings.tab_appearance")}</Tabs.Tab>
                                    <Tabs.Tab id="week">{t("settings.tab_week")}</Tabs.Tab>
                                    <Tabs.Tab id="limits">{t("settings.tab_limits")}</Tabs.Tab>
                                    <Tabs.Tab id="import">{t("settings.tab_import")}</Tabs.Tab>
                                </Tabs.List>

                <Tabs.Panel id="appearance">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6 items-center py-2">
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
                </Tabs.Panel>

                <Tabs.Panel id="week">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6 items-center py-2">
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
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="limits">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6 items-center py-2">
                  <h3 className="text-base dark:text-white">
                      {t("settings.hardLimits")}
                  </h3>
                  <ButtonGroup size="sm" className="col-span-2 justify-start">
                      <Button
                          variant="secondary"
                          className={clsx({ "bg-sky-500 text-white": !settings.hardLimits })}
                          onPress={() => updateSettings({ hardLimits: false })}
                      >
                          {t("settings.limitsSoft")}
                      </Button>
                      <Button
                          variant="secondary"
                          className={clsx({ "bg-sky-500 text-white": settings.hardLimits })}
                          onPress={() => updateSettings({ hardLimits: true })}
                      >
                          {t("settings.limitsHard")}
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
                  {/* Only once there is a limit for them to count towards: a list of categories
                      under a switched-off number is a question about nothing. */}
                  {settings.dayCapacity > 0 && (
                    <>
                      <h3 className="text-base dark:text-white">
                        {t("settings.countedCategories")}
                      </h3>
                      <div className="col-span-2 flex flex-wrap gap-1">
                        {[...categories, { id: NO_CATEGORY_KEY, name: t("category.none") }].map((category) => {
                          // An empty set counts everything, so nothing chosen shows as everything
                          // chosen rather than as a day that can never be full.
                          const counting = settings.dayCapacityCategories.length === 0
                            || settings.dayCapacityCategories.includes(category.id);

                          return (
                            <button
                              key={category.id}
                              type="button"
                              aria-pressed={counting}
                              onClick={() => updateSettings({
                                dayCapacityCategories: toggleCountedCategory(
                                  settings.dayCapacityCategories,
                                  category.id,
                                  [...categories.map((held) => held.id), NO_CATEGORY_KEY],
                                ),
                              })}
                              className={clsx(
                                "px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                counting
                                  ? "bg-sky-500 text-white"
                                  : "bg-slate-200 text-slate-500 dark:bg-sky-900 dark:text-slate-400 line-through",
                              )}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <h3 className="text-base dark:text-white">
                      {t("settings.thisWeekLimit")}
                  </h3>
                  <Select
                      value={`${settings.thisWeekLimit}`}
                      onChange={(key: Key | null) =>
                          key !== null && updateSettings({
                              thisWeekLimit: parseInt(`${key}`, 10),
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
                              {THIS_WEEK_LIMITS.map((limit) => {
                                  const label = limit === 0
                                      ? t("settings.dayCapacityOff")
                                      : t("settings.dayCapacityTasks", { limit });

                                  return (
                                      <ListBox.Item key={limit} id={`${limit}`} textValue={label}>
                                          <Label>{label}</Label>
                                      </ListBox.Item>
                                  );
                              })}
                          </ListBox>
                      </Select.Popover>
                  </Select>
                  <h3 className="text-base dark:text-white">
                    {t("settings.somedayLimit")}
                  </h3>
                  <Select
                    value={`${settings.somedayLimit}`}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        somedayLimit: parseInt(`${key}`, 10),
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
                        {SOMEDAY_LIMITS.map((limit) => {
                          const label = limit === 0
                            ? t("settings.dayCapacityOff")
                            : t("settings.dayCapacityTasks", { limit });

                          return (
                            <ListBox.Item key={limit} id={`${limit}`} textValue={label}>
                              <Label>{label}</Label>
                            </ListBox.Item>
                          );
                        })}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                    </div>
                </Tabs.Panel>

                <Tabs.Panel id="import">
                    <div className="grid grid-cols-3 gap-x-4 gap-y-6 items-start py-2">
                        <ImportPanel />
                    </div>
                </Tabs.Panel>
                            </Tabs>
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default SettingsModal;
