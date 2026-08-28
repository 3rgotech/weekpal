import React from "react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
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
    <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-sky-950">
      <div className="flex items-center">
        <Logo />
        <div className="ml-2">
          <SyncStatusIndicator />
        </div>
      </div>

      <div className="pr-2">
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <Button
              variant="light"
              className="dark:text-white"
              startContent={<MenuIcon size={18} />}
              endContent={<ChevronDown size={14} />}
            >
              {t("actions.menu")}
            </Button>
          </DropdownTrigger>
          <DropdownMenu aria-label={t("actions.menu")}>
            {/* An array, so the install entry can be absent without leaving a `false` in what
                HeroUI reads as a collection. */}
            <DropdownSection showDivider>
              {[(
              <DropdownItem
                key="leftovers"
                className="dark:text-white"
                startContent={<Inbox size={16} />}
                endContent={badge && (
                  <span className="px-1.5 rounded-full bg-danger text-white text-xs">{badge}</span>
                )}
                onPress={onReviewLeftovers}
              >
                {t("leftovers.open")}
              </DropdownItem>
              ), (
              <DropdownItem
                key="visibility"
                className="dark:text-white"
                startContent={settings.showCompletedTasks ? <EyeOff size={16} /> : <Eye size={16} />}
                onPress={() => updateSettings({ showCompletedTasks: !settings.showCompletedTasks })}
              >
                {settings.showCompletedTasks
                  ? t("visibility.hide_completed_tasks")
                  : t("visibility.show_completed_tasks")}
              </DropdownItem>
              ), (
              <DropdownItem
                key="print"
                className="dark:text-white"
                startContent={<Printer size={16} />}
                onPress={() => window.print()}
              >
                {t("actions.print")}
              </DropdownItem>
              ), (
              <DropdownItem
                key="settings"
                className="dark:text-white"
                startContent={<Settings size={16} />}
                onPress={openSettingsModal}
              >
                {t("actions.settings")}
              </DropdownItem>
              ), ...(canInstall ? [(
                <DropdownItem
                  key="install"
                  className="dark:text-white"
                  startContent={<Download size={16} />}
                  // iOS has no prompt to fire, so there the entry is the instruction itself.
                  description={needsManualSteps ? t("actions.install_steps") : undefined}
                  onPress={() => { void install(); }}
                >
                  {t("actions.install")}
                </DropdownItem>
              )] : [])]}
            </DropdownSection>

            {/* An array rather than a fragment: HeroUI's menu is a react-aria collection, and a
                fragment in it is not a collection node — the items inside simply vanish. */}
            <DropdownSection>
              {accountUrl ? [(
                <DropdownItem
                  key="account"
                  className="dark:text-white"
                  startContent={<User size={16} />}
                  onPress={() => {
                    window.location.href = accountUrl;
                  }}
                >
                  {t("actions.user_menu")}
                </DropdownItem>
              )] : [(
                <DropdownItem
                  key="signup"
                  className="dark:text-white"
                  startContent={<UserPlus size={16} />}
                  onPress={() => {
                    if (signupUrl) window.location.href = signupUrl;
                  }}
                >
                  {t("actions.sign_up")}
                </DropdownItem>
              ), (
                <DropdownItem
                  key="login"
                  className="dark:text-white"
                  startContent={<LogIn size={16} />}
                  onPress={() => {
                    if (loginUrl) window.location.href = loginUrl;
                  }}
                >
                  {t("actions.log_in")}
                </DropdownItem>
              )]}
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
};

export default MobileTopBar;
