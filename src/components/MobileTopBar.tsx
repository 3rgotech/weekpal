import React from "react";
import { buttonVariants, Description, Dropdown, Label, Separator } from "@heroui/react";
import clsx from "clsx";
import { ChevronDown, Download, Eye, EyeOff, Inbox, LogIn, Menu as MenuIcon, Printer, Settings, User, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import Logo from "./Logo";
import SyncStatusIndicator from "./SyncStatusIndicator";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import { getEnvConfig } from "../utils/env";
import { leftoverBadge } from "../utils/settings";
import { useInstallPrompt } from "../utils/install";

interface MobileTopBarProps {
  onReviewLeftovers: () => void;
}

/**
 * The top bar on the vertical board: the logo, sync state, and one menu holding everything the
 * wide bar spreads across its right-hand side.
 *
 * Icon *and* word on the trigger. An unlabelled hamburger on a board whose rows already carry
 * three icon-only controls would be the fourth thing to guess at.
 */
const MobileTopBar: React.FC<MobileTopBarProps> = ({ onReviewLeftovers }) => {
  const { t } = useTranslation();
  const { settings, updateSettings, openSettingsModal } = useSettings();
  const { leftovers } = useData();
  const { canInstall, needsManualSteps, install } = useInstallPrompt();
  const { accountUrl, signupUrl, loginUrl } = getEnvConfig();

  const badge = leftoverBadge(leftovers.length);

  return (
    /* Same idea at the top: the installed app draws under the status bar. */
    <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-sky-950 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center">
        <Logo />
        <div className="ml-2">
          <SyncStatusIndicator />
        </div>
      </div>

      <div className="pr-2">
        <Dropdown>
          {/* The trigger is itself a button in v3 — and a react-aria one, not HeroUI's, so it
              takes its look from the variants rather than a `variant` prop. */}
          <Dropdown.Trigger className={clsx(buttonVariants({ variant: "tertiary" }), "flex items-center gap-2 whitespace-nowrap")}>
            <MenuIcon size={18} />
            {t("actions.menu")}
            <ChevronDown size={14} />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom end">
            <Dropdown.Menu aria-label={t("actions.menu")}>
              {/* Written as ordinary conditional children. HeroUI 2 needed every one of these
                  wrapped in an array, because a fragment was not a node its collection builder
                  recognised and the items inside it silently disappeared. v3's menu is a
                  react-aria-components collection, which reads conditionals directly. */}
              <Dropdown.Section>
                <Dropdown.Item
                  id="leftovers"
                  textValue={t("leftovers.open")}
                  onAction={onReviewLeftovers}
                >
                  <Inbox size={16} />
                  <Label>{t("leftovers.open")}</Label>
                  {badge && (
                    <span className="px-1.5 rounded-full bg-danger text-white text-xs">{badge}</span>
                  )}
                </Dropdown.Item>

                <Dropdown.Item
                  id="visibility"
                  textValue={settings.showCompletedTasks
                    ? t("visibility.hide_completed_tasks")
                    : t("visibility.show_completed_tasks")}
                  onAction={() => updateSettings({ showCompletedTasks: !settings.showCompletedTasks })}
                >
                  {settings.showCompletedTasks ? <EyeOff size={16} /> : <Eye size={16} />}
                  <Label>
                    {settings.showCompletedTasks
                      ? t("visibility.hide_completed_tasks")
                      : t("visibility.show_completed_tasks")}
                  </Label>
                </Dropdown.Item>

                <Dropdown.Item id="print" textValue={t("actions.print")} onAction={() => window.print()}>
                  <Printer size={16} />
                  <Label>{t("actions.print")}</Label>
                </Dropdown.Item>

                <Dropdown.Item id="settings" textValue={t("actions.settings")} onAction={openSettingsModal}>
                  <Settings size={16} />
                  <Label>{t("actions.settings")}</Label>
                </Dropdown.Item>

                {canInstall && (
                  <Dropdown.Item
                    id="install"
                    textValue={t("actions.install")}
                    onAction={() => { void install(); }}
                  >
                    <Download size={16} />
                    <Label>{t("actions.install")}</Label>
                    {/* iOS has no prompt to fire, so there the entry is the instruction itself. */}
                    {needsManualSteps && <Description>{t("actions.install_steps")}</Description>}
                  </Dropdown.Item>
                )}
              </Dropdown.Section>

              <Separator />

              <Dropdown.Section>
                {accountUrl ? (
                  <Dropdown.Item
                    id="account"
                    textValue={t("actions.user_menu")}
                    onAction={() => {
                      window.location.href = accountUrl;
                    }}
                  >
                    <User size={16} />
                    <Label>{t("actions.user_menu")}</Label>
                  </Dropdown.Item>
                ) : (
                  <>
                    <Dropdown.Item
                      id="signup"
                      textValue={t("actions.sign_up")}
                      onAction={() => {
                        if (signupUrl) window.location.href = signupUrl;
                      }}
                    >
                      <UserPlus size={16} />
                      <Label>{t("actions.sign_up")}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="login"
                      textValue={t("actions.log_in")}
                      onAction={() => {
                        if (loginUrl) window.location.href = loginUrl;
                      }}
                    >
                      <LogIn size={16} />
                      <Label>{t("actions.log_in")}</Label>
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
};

export default MobileTopBar;
