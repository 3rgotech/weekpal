import React, { useState } from "react";
import { Dropdown, Label, Separator } from "@heroui/react";
import clsx from "clsx";
import { Bug, CalendarDays, CalendarOff, ChevronDown, ChevronsDownUp, ChevronsUpDown, Download, Eye, EyeOff, Inbox, LogIn, Menu as MenuIcon, Printer, Settings, User, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import SyncStatusIndicator from "./SyncStatusIndicator";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import { getEnvConfig } from "../utils/env";
import { leftoverBadge } from "../utils/settings";
import { useInstallPrompt } from "../utils/install";
import InstallModal from "./InstallModal";
import FeedbackModal from "./FeedbackModal";
import { useShortcuts } from "../contexts/ShortcutsContext";
import { MENU_HINT_CLASS, MENU_ICON_CLASS, MENU_POPOVER_CLASS, MENU_ROW_CLASS, MENU_SEPARATOR_CLASS } from "../utils/menu";


/**
 * The top bar on the vertical board: the logo, sync state, and one menu holding everything the
 * wide bar spreads across its right-hand side.
 *
 * Icon *and* word on the trigger. An unlabelled hamburger on a board whose rows already carry
 * three icon-only controls would be the fourth thing to guess at.
 */
const MobileTopBar: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSettings, openSettingsModal } = useSettings();
  const { leftovers, feedbackAdapter } = useData();
  const { canInstall, needsManualSteps, install } = useInstallPrompt();
  const { setLeftoversOpen } = useShortcuts();
  const [installSteps, setInstallSteps] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { accountUrl, signupUrl, loginUrl } = getEnvConfig();

  const badge = leftoverBadge(leftovers.length);

  return (
    /* Same idea at the top: the installed app draws under the status bar. */
    <div className="flex items-center justify-between w-full shrink-0 h-[calc(56px+env(safe-area-inset-top))] pl-3.5 pr-3 bg-wp-chrome border-b border-wp-border pt-[env(safe-area-inset-top)]">
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo />
        <SyncStatusIndicator className="min-w-0" />
      </div>

      <div className="shrink-0">
        <Dropdown>
          {/* The trigger is itself a button in v3 — a react-aria one, not HeroUI's — so it is
              styled here directly: the redesign's bordered secondary button. */}
          <Dropdown.Trigger
            data-tour="menu"
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-wp-border-strong py-[7px] pl-3 pr-2.5 text-[13px] font-semibold text-wp-fg cursor-pointer hover:bg-wp-track"
          >
            <MenuIcon size={16} />
            {t("actions.menu")}
            <ChevronDown size={14} className="text-wp-muted" />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end" className={MENU_POPOVER_CLASS}>
            <Dropdown.Menu aria-label={t("actions.menu")}>
              {/* Written as ordinary conditional children. HeroUI 2 needed every one of these
                  wrapped in an array, because a fragment was not a node its collection builder
                  recognised and the items inside it silently disappeared. v3's menu is a
                  react-aria-components collection, which reads conditionals directly. */}
              <Dropdown.Section>
                <Dropdown.Item
                  className={MENU_ROW_CLASS}
                  id="leftovers"
                  textValue={t("leftovers.open")}
                  onAction={() => setLeftoversOpen(true)}
                >
                  <Inbox size={16} className={MENU_ICON_CLASS} />
                  <Label>{t("leftovers.open")}</Label>
                  {badge && (
                    <span className={clsx(MENU_HINT_CLASS, "font-bold text-wp-warn")}>{badge}</span>
                  )}
                </Dropdown.Item>

                {/* First after the inbox, and available to everybody. Most of a beta happens on
                    a phone, and a report nobody can find is a report nobody sends. */}
                {feedbackAdapter && (
                  <Dropdown.Item
                    className={MENU_ROW_CLASS}
                    id="feedback"
                    textValue={t("feedback.open")}
                    onAction={() => setFeedbackOpen(true)}
                  >
                    <Bug size={16} className={MENU_ICON_CLASS} />
                    <Label>{t("feedback.open")}</Label>
                  </Dropdown.Item>
                )}

                <Dropdown.Item
                  className={MENU_ROW_CLASS}
                  id="visibility"
                  textValue={settings.showCompletedTasks
                    ? t("visibility.hide_completed_tasks")
                    : t("visibility.show_completed_tasks")}
                  onAction={() => updateSettings({ showCompletedTasks: !settings.showCompletedTasks })}
                >
                  {settings.showCompletedTasks
                    ? <EyeOff size={16} className={MENU_ICON_CLASS} />
                    : <Eye size={16} className={MENU_ICON_CLASS} />}
                  <Label>
                    {settings.showCompletedTasks
                      ? t("visibility.hide_completed_tasks")
                      : t("visibility.show_completed_tasks")}
                  </Label>
                </Dropdown.Item>

                {/* The phone menu is the wide board's visibility dropdown, flattened: there is
                    no room for a submenu, so the same three switches sit here as siblings. */}
                <Dropdown.Item
                  className={MENU_ROW_CLASS}
                  id="events"
                  textValue={settings.showEvents
                    ? t("visibility.hide_events")
                    : t("visibility.show_events")}
                  onAction={() => updateSettings({ showEvents: !settings.showEvents })}
                >
                  {settings.showEvents
                    ? <CalendarOff size={16} className={MENU_ICON_CLASS} />
                    : <CalendarDays size={16} className={MENU_ICON_CLASS} />}
                  <Label>
                    {settings.showEvents
                      ? t("visibility.hide_events")
                      : t("visibility.show_events")}
                  </Label>
                </Dropdown.Item>

                {/* Only while there are events to expand: offering to open out a calendar that is
                    switched off is offering to do nothing. */}
                {settings.showEvents && (
                  <Dropdown.Item
                    className={MENU_ROW_CLASS}
                    id="expandEvents"
                    textValue={settings.expandEvents
                      ? t("visibility.collapse_events")
                      : t("visibility.expand_events")}
                    onAction={() => updateSettings({ expandEvents: !settings.expandEvents })}
                  >
                    {settings.expandEvents
                      ? <ChevronsDownUp size={16} className={MENU_ICON_CLASS} />
                      : <ChevronsUpDown size={16} className={MENU_ICON_CLASS} />}
                    <Label>
                      {settings.expandEvents
                        ? t("visibility.collapse_events")
                        : t("visibility.expand_events")}
                    </Label>
                  </Dropdown.Item>
                )}

                <Dropdown.Item id="print" className={MENU_ROW_CLASS} textValue={t("actions.print")} onAction={() => window.print()}>
                  <Printer size={16} className={MENU_ICON_CLASS} />
                  <Label>{t("actions.print")}</Label>
                </Dropdown.Item>

                {/* No shortcuts entry here. This bar is the board you navigate by tapping; a
                    sheet of keys is an entry that cannot be acted on from the device showing it. */}
                <Dropdown.Item id="settings" className={MENU_ROW_CLASS} textValue={t("actions.settings")} onAction={openSettingsModal}>
                  <Settings size={16} className={MENU_ICON_CLASS} />
                  <Label>{t("actions.settings")}</Label>
                </Dropdown.Item>

                {canInstall && (
                  <Dropdown.Item
                    className={MENU_ROW_CLASS}
                    id="install"
                    textValue={t("actions.install")}
                    onAction={() => {
                      // iOS has no prompt to fire. The instruction used to be a description
                      // beside the label, which squeezed "Install app" onto two lines and put a
                      // paragraph in a menu; it is a dialog of its own now.
                      if (needsManualSteps) {
                        setInstallSteps(true);
                      } else {
                        void install();
                      }
                    }}
                  >
                    <Download size={16} className={MENU_ICON_CLASS} />
                    <Label>{t("actions.install")}</Label>
                  </Dropdown.Item>
                )}
              </Dropdown.Section>

              <Separator className={MENU_SEPARATOR_CLASS} />

              <Dropdown.Section>
                {accountUrl ? (
                  <Dropdown.Item
                    className={MENU_ROW_CLASS}
                    id="account"
                    textValue={t("actions.user_menu")}
                    onAction={() => {
                      window.location.href = accountUrl;
                    }}
                  >
                    <User size={16} className={MENU_ICON_CLASS} />
                    <Label>{t("actions.user_menu")}</Label>
                  </Dropdown.Item>
                ) : (
                  <>
                    <Dropdown.Item
                      className={MENU_ROW_CLASS}
                      id="signup"
                      textValue={t("actions.sign_up")}
                      onAction={() => {
                        if (signupUrl) window.location.href = signupUrl;
                      }}
                    >
                      {/* In the accent: on the demo this is the way out, and the one row worth
                          finding first. */}
                      <UserPlus size={16} className="shrink-0 text-wp-accent" />
                      <Label className="text-wp-accent">{t("actions.sign_up")}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      className={MENU_ROW_CLASS}
                      id="login"
                      textValue={t("actions.log_in")}
                      onAction={() => {
                        if (loginUrl) window.location.href = loginUrl;
                      }}
                    >
                      <LogIn size={16} className={MENU_ICON_CLASS} />
                      <Label>{t("actions.log_in")}</Label>
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>

      <InstallModal isOpen={installSteps} onOpenChange={setInstallSteps} />
      <FeedbackModal
        adapter={feedbackAdapter}
        isOpen={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </div>
  );
};

export default MobileTopBar;
