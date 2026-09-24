import React from "react";
import {
    Button,
    Label,
    ListBox,
    Modal,
    Select,
    Tabs,
} from "@heroui/react";
import type { Key } from "react-aria-components";
import clsx from "clsx";
import { Check, Compass, Eye, EyeOff, MonitorIcon, MoonIcon, SunIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Language, LayoutPreset, SubtaskDisplay, Theme } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import { useChangelog } from "../contexts/ChangelogContext";
import { useOnboarding } from "../contexts/OnboardingContext";
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
import { WORKING_DAY_CHOICES } from "../utils/hours";
import { NO_CATEGORY_KEY } from "../utils/categories";
import ImportPanel from "./ImportPanel";
import { getEnvConfig } from "../utils/env";
import { useAccount } from "../contexts/AccountContext";
import { LAYOUT_PRESETS } from "../utils/settings";

/**
 * One setting: its name (and, where it needs one, a line saying what it does) in a fixed column,
 * the control beside it, and a hairline under the pair — the redesign's form, which reads as a
 * list of settings rather than as the grid of floating labels it replaced.
 *
 * Stacked on a phone, where a 200px label column would leave the control no room at all.
 */
const Row: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }> = ({
    label,
    hint,
    children,
}) => (
    <div className="flex flex-col gap-2 py-3.5 border-b border-wp-border last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-col gap-[3px] sm:w-[200px] sm:shrink-0">
            <h3 className="text-[13px] font-semibold text-wp-fg">{label}</h3>
            {hint && <p className="text-xs leading-[1.4] text-wp-muted">{hint}</p>}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
    </div>
);

interface SegmentOption<T> {
    value: T;
    label: React.ReactNode;
    icon?: React.ReactNode;
}

/**
 * Two or three mutually exclusive choices, all on screen at once: the redesign's segmented
 * control, a raised pill on a sunken track. Replaces the button groups whose "selected" was a
 * solid blue fill — which, next to the dialog's one primary button, read as a second one.
 */
function Segmented<T>({ options, value, onChange }: {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
}) {
    return (
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[9px] bg-wp-track p-[3px]">
            {options.map((option) => {
                const on = option.value === value;

                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onChange(option.value)}
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer",
                            "focus-visible:outline-2 focus-visible:outline-wp-accent [&_svg]:size-3.5",
                            on
                                ? "bg-wp-seg-active text-wp-fg shadow-wp-seg [&_svg]:text-wp-accent"
                                : "text-wp-fg-secondary hover:text-wp-fg [&_svg]:text-wp-muted",
                        )}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** The redesign's field: every select in the dialog is the same full-width trigger. */
const SELECT_CLASS = "w-full";

/*
 * Each tab scrolls on its own under a fixed header and footer: the limits tab is the longest, and
 * scrolling the tabs away with it would leave nothing saying which tab you are on.
 */
const PANEL_CLASS = "mt-0 px-6 pt-1.5 pb-2.5 max-h-[calc(100dvh-16rem)] overflow-y-auto";

/**
 * The settings dialog.
 *
 * Four tabs rather than one long column: the board's settings outgrew a single scroll once the
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
    const proUrl = getEnvConfig().proUrl;
    const { subscribed } = useAccount();
    const { settings, updateSettings, settingsOverlay: overlay, closeSettingsModal } = useSettings();
    const { available: changelogAvailable, openChangelog } = useChangelog();
    const { startTour } = useOnboarding();
    const { categories } = useData();
    const dayjs = useDayJs(settings.language);

    /** A date that falls on ISO weekday `day`, purely so the locale can name it. */
    const nameOf = (day: Weekday, format: string) =>
        dayjs().startOf("isoWeek").add(day - 1, "day").format(format);

    return (
        <Modal state={overlay}>
            <Modal.Backdrop variant="blur">
                <Modal.Container size="lg">
                    <Modal.Dialog className="max-w-[640px] p-0 overflow-hidden">
                        <Modal.Header className="flex-row items-center justify-between pt-[18px] pr-4 pl-6">
                            <Modal.Heading>{t("settings.settings")}</Modal.Heading>
                            <button
                                type="button"
                                onClick={closeSettingsModal}
                                aria-label={t("actions.close")}
                                className="flex size-8 items-center justify-center rounded-lg text-wp-fg-secondary cursor-pointer hover:bg-wp-track focus-visible:outline-2 focus-visible:outline-wp-accent"
                            >
                                <X size={18} />
                            </button>
                        </Modal.Header>
                        <Modal.Body className="m-0 mt-3.5 p-0">
                            {/* No save button, and deliberately none: every control writes as it
                                is changed — to localStorage first, then to the server — so a tab
                                can be left at any moment without losing anything, and closing the
                                dialog is not a decision. The footer says so. */}
                            {/* The underlined row is drawn from `index.css`: HeroUI's own
                                `Tabs.Indicator` throws outside a `SharedElementTransition`. */}
                            <Tabs aria-label={t("settings.settings")} className="gap-0">
                                <Tabs.List aria-label={t("settings.settings")} className="px-6">
                                    <Tabs.Tab id="appearance">{t("settings.tab_appearance")}</Tabs.Tab>
                                    <Tabs.Tab id="week">{t("settings.tab_week")}</Tabs.Tab>
                                    <Tabs.Tab id="limits">{t("settings.tab_limits")}</Tabs.Tab>
                                    <Tabs.Tab id="import">{t("settings.tab_import")}</Tabs.Tab>
                                </Tabs.List>

                <Tabs.Panel id="appearance" className={PANEL_CLASS}>
                  <Row label={t("settings.theme")}>
                    <Segmented<Theme>
                      value={settings.theme}
                      onChange={(theme) => updateSettings({ theme })}
                      options={[
                        { value: "light", label: t("theme.light"), icon: <SunIcon /> },
                        { value: "dark", label: t("theme.dark"), icon: <MoonIcon /> },
                        { value: "system", label: t("theme.system"), icon: <MonitorIcon /> },
                      ]}
                    />
                  </Row>
                  <Row label={t("settings.language")}>
                  <Select
                    value={settings.language}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({ language: String(key) as Language })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                  <Row label={t("settings.subtaskDisplay")} hint={t("settings.subtaskDisplayHint")}>
                  <Select
                    value={settings.subtaskDisplay}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        subtaskDisplay: String(key) as SubtaskDisplay,
                      })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                  <Row label={t("settings.weekHeaderFormat")}>
                  <Select
                    value={settings.weekHeaderFormat}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({ weekHeaderFormat: `${key}` })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                  <Row label={t("settings.dayHeaderFormat")}>
                  <Select
                    value={settings.dayHeaderFormat}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({ dayHeaderFormat: `${key}` })
                    }
                    className={SELECT_CLASS}
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
                  </Row>

                  {/* *(rt §4)* Default off: a finished task stays where it was written, because
                      moving it destroys spatial memory at the one moment the board should be
                      quiet. To-do and done in separate spaces is still a real preference, which
                      is the whole reason this control exists. */}
                  <Row label={t("settings.completionResort")}>
                    <Segmented
                      value={settings.completionResort}
                      onChange={(completionResort) => updateSettings({ completionResort })}
                      options={[
                        { value: false, label: t("settings.completionStay") },
                        { value: true, label: t("settings.completionMove") },
                      ]}
                    />
                  </Row>
                </Tabs.Panel>

                <Tabs.Panel id="week" className={PANEL_CLASS}>
                  <Row label={t("settings.weekStartsOn")}>
                  <Select
                    value={`${settings.weekStartsOn}`}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        weekStartsOn: parseInt(`${key}`, 10) as Weekday,
                      })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                  {/* Listed in this user's own week order, so the row reads the way the board does.
                      Buttons rather than a multi-select: seven options that are all on screen at once
                      are quicker to set than a popover, and this is the setting people revisit. */}
                  <Row label={t("settings.workingDays")}>
                  <div className="flex gap-1">
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
                            "flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.4px] transition-colors cursor-pointer",
                            "focus-visible:outline-2 focus-visible:outline-wp-accent",
                            isWorking
                              ? "bg-wp-accent text-wp-on-accent"
                              : "bg-wp-track text-wp-muted hover:text-wp-fg-secondary",
                          )}
                        >
                          {nameOf(day, "dd")}
                        </button>
                      );
                    })}
                  </div>
                  </Row>
                  {/* R14: named layouts, not a grid builder. Pro, and disabled rather than hidden
                      without it — the same treatment as a category's day limit: a control you can
                      see and cannot use says the feature exists, without a word of sales. */}
                  <Row
                    label={t("settings.layout")}
                    hint={!subscribed ? t("settings.layoutPro") : undefined}
                  >
                  <Select
                    value={subscribed ? settings.layoutPreset : "compressed"}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({ layoutPreset: `${key}` as LayoutPreset })
                    }
                    className={SELECT_CLASS}
                    isDisabled={!subscribed}
                    aria-label={t("settings.layout")}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {LAYOUT_PRESETS.map((preset) => (
                          <ListBox.Item key={preset} id={preset} textValue={t(`settings.layouts.${preset}`)}>
                            <Label>{t(`settings.layouts.${preset}`)}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  </Row>
                  <Row label={t("settings.nonWorkingDays")}>
                    <Segmented
                      value={settings.showNonWorkingDays}
                      onChange={(showNonWorkingDays) => updateSettings({ showNonWorkingDays })}
                      options={[
                        { value: true, label: t("actions.show"), icon: <Eye /> },
                        { value: false, label: t("actions.hide"), icon: <EyeOff /> },
                      ]}
                    />
                  </Row>
                </Tabs.Panel>

                <Tabs.Panel id="limits" className={PANEL_CLASS}>
                  <Row label={t("settings.hardLimits")}>
                    <Segmented
                      value={settings.hardLimits}
                      onChange={(hardLimits) => updateSettings({ hardLimits })}
                      options={[
                        { value: false, label: t("settings.limitsSoft") },
                        { value: true, label: t("settings.limitsHard") },
                      ]}
                    />
                  </Row>
                  {/* *(rt §5)* The denominator for measuring a day in hours instead of tasks.
                      0 is off and is the default — it says nothing until tasks carry estimates,
                      and nobody should have to answer this before seeing the board. */}
                  <Row label={t("settings.workingDayHours")}>
                  <Select
                    value={`${settings.workingDayHours}`}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        workingDayHours: parseInt(`${key}`, 10),
                      })
                    }
                    className={SELECT_CLASS}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {WORKING_DAY_CHOICES.map((choice) => (
                          <ListBox.Item key={choice} id={`${choice}`} textValue={choice === 0 ? t("settings.off") : `${choice}h`}>
                            <Label>{choice === 0 ? t("settings.off") : `${choice}h`}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  </Row>

                  <Row label={t("settings.dayCapacity")}>
                  <Select
                    value={`${settings.dayCapacity}`}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        dayCapacity: parseInt(`${key}`, 10),
                      })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                  {/* Only once there is a limit for them to count towards: a list of categories
                      under a switched-off number is a question about nothing. */}
                  {settings.dayCapacity > 0 && (
                    <Row label={t("settings.countedCategories")}>
                      <div className="flex flex-wrap gap-1">
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
                                "px-2.5 py-1 rounded-full border text-xs font-semibold transition-colors cursor-pointer",
                                "focus-visible:outline-2 focus-visible:outline-wp-accent",
                                counting
                                  ? "bg-wp-accent border-wp-accent text-wp-on-accent"
                                  : "border-wp-border-strong text-wp-muted line-through",
                              )}
                            >
                              {category.name}
                            </button>
                          );
                        })}
                      </div>
                    </Row>
                  )}
                  <Row label={t("settings.thisWeekLimit")}>
                  <Select
                      value={`${settings.thisWeekLimit}`}
                      onChange={(key: Key | null) =>
                          key !== null && updateSettings({
                              thisWeekLimit: parseInt(`${key}`, 10),
                          })
                      }
                      className={SELECT_CLASS}
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
                  </Row>
                  <Row label={t("settings.somedayLimit")}>
                  <Select
                    value={`${settings.somedayLimit}`}
                    onChange={(key: Key | null) =>
                      key !== null && updateSettings({
                        somedayLimit: parseInt(`${key}`, 10),
                      })
                    }
                    className={SELECT_CLASS}
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
                  </Row>
                </Tabs.Panel>

                <Tabs.Panel id="import" className={PANEL_CLASS}>
                    <ImportPanel />
                </Tabs.Panel>
                            </Tabs>
                        </Modal.Body>

                        {/* The one thing in here that is not a setting.

                            It goes in the dialog rather than the toolbar because the toolbar is
                            for things done to this week, and it is the place people already open
                            when they are looking for the app itself rather than their board. The
                            settings dialog closes on the way: two stacked dialogs would leave the
                            release notes sitting on top of a form the user then has to dismiss
                            twice. */}
                        <Modal.Footer className="mt-0 flex-wrap justify-between gap-3 border-t border-wp-border bg-wp-surface px-6 py-3.5">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Beside the release notes because they are the same kind of
                                    thing: not a setting, but something a person comes to this
                                    dialog looking for. The tour has to be replayable — it runs
                                    once, on the day somebody understands the product least. */}
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        closeSettingsModal();
                                        startTour();
                                    }}
                                >
                                    <Compass size={15} className="text-wp-accent" />
                                    {t("tour.replay")}
                                </Button>
                                {changelogAvailable && (
                                    <Button
                                        variant="secondary"
                                        onPress={() => {
                                            closeSettingsModal();
                                            openChangelog();
                                        }}
                                    >
                                        {t("changelog.title")}
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-wp-muted">
                                {/* The one line about Pro (R5). A link, not a prompt: the board
                                    sells nothing, and this is where someone looking for the tier
                                    looks. */}
                                {proUrl && (
                                    <a
                                        href={proUrl}
                                        target="_blank"
                                        rel="noopener"
                                        className="underline underline-offset-2 text-wp-fg-secondary hover:text-wp-fg"
                                    >
                                        {t("settings.pro_line")}
                                    </a>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                    <Check size={14} aria-hidden="true" />
                                    {t("settings.autosaved")}
                                </span>
                            </div>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default SettingsModal;
