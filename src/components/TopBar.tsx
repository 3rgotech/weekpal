import React from "react";
import Logo from "./Logo";
import WeekSelector from "./WeekSelector";
import CategoryFilter from "./CategoryFilter";
import Menu from "./Menu";
import SignupCallToAction from "./SignupCallToAction";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { Badge, Tooltip } from "@heroui/react";
import { ICON_BUTTON_CLASS, ICON_BUTTON_WRAPPER_CLASS, TOOLTIP_CLASSES } from "../utils/color";
import SyncStatusIndicator from "./SyncStatusIndicator";
import VisibilityFilter from "./VisibilityFilter";
import { getEnvConfig } from "../utils/env";
import { useData } from "../contexts/DataContext";
import { leftoverBadge } from "../utils/settings";
import { useInstallPrompt } from "../utils/install";

interface TopBarProps {
  /** Opens the weekly look back at unfinished tasks, which otherwise shows itself once a week. */
  onReviewLeftovers?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onReviewLeftovers }) => {
  const { openSettingsModal } = useSettings();
  const { t } = useTranslation();
  const { leftovers } = useData();
  const { canInstall, needsManualSteps, install } = useInstallPrompt();

  // Closing the review hides it until next week, so without this the board gave no sign that
  // anything was still waiting in it.
  const badge = leftoverBadge(leftovers.length);

  // The board is embedded in the host application, which owns everything about the
  // account — profile, password, subscription, API tokens. Rather than rebuild any of
  // that here, the user button leaves for it.
  //
  // Absent when the board runs standalone or in demo mode. On the demo the button does not
  // simply disappear — there is no account to open, but there is one to create, so the space
  // becomes the invitation to make one.
  const { accountUrl, signupUrl, loginUrl } = getEnvConfig();

  return (
    <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-sky-950 pt-[env(safe-area-inset-top)]">
      {/* `min-w-0` so the week label and sync chip give way rather than pushing the buttons off
          the right edge, which is what a tablet-width bar did. */}
      <div className="flex items-stretch min-w-0">
        <Logo />
        <WeekSelector />
        <div className="flex items-center ml-4">
          <SyncStatusIndicator />
        </div>
      </div>
      <div className="flex items-stretch">
        <Tooltip content={t("actions.category_filter")} placement="left" showArrow classNames={TOOLTIP_CLASSES}>
          <div className="flex items-stretch justify-center h-12 xl:h-16 border-l border-slate-300 dark:border-sky-900">
            <CategoryFilter />
          </div>
        </Tooltip>
        {/* <Menu icon="refresh" title="Refresh" /> */}
        {onReviewLeftovers && (
          <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
            <Badge
              content={badge}
              color="danger"
              size="sm"
              shape="circle"
              isInvisible={badge === null}
              aria-label={t("leftovers.waiting", { count: leftovers.length })}
            >
              <IconButton
                icon="inbox"
                iconClass={ICON_BUTTON_CLASS}
                wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
                tooltip={t("leftovers.open")}
                onClick={onReviewLeftovers}
                size="md"
              />
            </Badge>
          </div>
        )}
        {/* Only when there is something to install: gone inside the installed app, and gone in
            any browser that cannot install at all. An iPad in landscape gets this bar too, and
            iOS has no prompt to fire — so there the tooltip carries the instruction rather than
            labelling a button that would do nothing. */}
        {canInstall && (
          <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
            <IconButton
              icon="download"
              iconClass={ICON_BUTTON_CLASS}
              wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
              tooltip={needsManualSteps ? t("actions.install_steps") : t("actions.install")}
              onClick={() => { void install(); }}
              size="md"
            />
          </div>
        )}
        <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="print"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.print")}
            onClick={() => window.print()}
            size="md"
          />
        </div>
        <Tooltip content={t("actions.visibility_filter")} placement="bottom" showArrow classNames={TOOLTIP_CLASSES}>
          <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
            <VisibilityFilter />
          </div>
        </Tooltip>
        <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
          <IconButton
            icon="settings"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.settings")}
            onClick={openSettingsModal}
            size="md"
          />
        </div>
        {!accountUrl && signupUrl && (
          <SignupCallToAction signupUrl={signupUrl} loginUrl={loginUrl} />
        )}
        {accountUrl && (
          <div className="flex items-center justify-center size-12 xl:size-16 border-l border-slate-300 dark:border-sky-900">
            <IconButton
              icon="user"
              iconClass={ICON_BUTTON_CLASS}
              wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
              tooltip={t("actions.user_menu")}
              onClick={() => {
                // A full navigation, not a new tab: the account pages are part of the same
                // application, and the board restores its state from IndexedDB on return.
                window.location.href = accountUrl;
              }}
              size="md"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
