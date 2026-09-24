import React, { useState } from "react";
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
import InstallModal from "./InstallModal";
import ShareWeekModal from "./ShareWeekModal";
import AvoidanceReportModal from "./AvoidanceReportModal";
import FeedbackModal from "./FeedbackModal";
import { useAccount } from "../contexts/AccountContext";
import { useShortcuts } from "../contexts/ShortcutsContext";

const TopBar: React.FC = () => {
  const { openSettingsModal } = useSettings();
  const { t } = useTranslation();
  const { leftovers, shareAdapter, insightsAdapter, feedbackAdapter } = useData();
  const { subscribed } = useAccount();
  const { canInstall, needsManualSteps, install } = useInstallPrompt();
  const { openHelp, setLeftoversOpen } = useShortcuts();
  const [installSteps, setInstallSteps] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [avoidanceOpen, setAvoidanceOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
    <div className="flex items-center justify-between gap-4 w-full shrink-0 h-[calc(60px+env(safe-area-inset-top))] px-3 xl:px-5 bg-wp-chrome border-b border-wp-border pt-[env(safe-area-inset-top)]">
      {/* `min-w-0` so the week label and sync chip give way rather than pushing the buttons off
          the right edge, which is what a tablet-width bar did. */}
      <div className="flex items-center gap-3 xl:gap-4 min-w-0">
        <Logo />
        <span className="h-[22px] w-px shrink-0 bg-wp-border-strong" aria-hidden="true" />
        <WeekSelector />
        <SyncStatusIndicator className="shrink-0" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Tooltip>
          <Tooltip.Trigger>
            <CategoryFilter />
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" showArrow className={TOOLTIP_CLASSES}>
            {t("actions.category_filter")}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip>
        <span className="h-[22px] w-px bg-wp-border-strong" aria-hidden="true" />
        <div className="flex items-center gap-0.5">
          <div data-tour="leftovers">
            {/* `isInvisible` is gone in v3, and rendering an empty badge in its place would
                leave a dot on the button with nothing in it — so an empty inbox has no badge. */}
            <Badge.Anchor>
          <IconButton
            icon="inbox"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("leftovers.open")}
            onClick={() => setLeftoversOpen(true)}
            size="md"
          />
              {badge !== null && (
                <Badge
                  color="danger"
                  size="sm"
                  aria-label={t("leftovers.waiting", { count: leftovers.length })}
                >
                  <Badge.Label>{badge}</Badge.Label>
                </Badge>
              )}
            </Badge.Anchor>
          </div>
          {/* Beside the other utilities, and available to everybody — a bug report is not a
              premium feature, and during a beta it is the most valuable thing anybody can send. */}
          {feedbackAdapter && (
          <IconButton
            icon="feedback"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("feedback.open")}
            onClick={() => setFeedbackOpen(true)}
            size="md"
          />
          )}
          {/* *(rt §5)* Visible only with a plan. No in-app upgrade prompts — that is a deliberate
              product decision, and a greyed-out button explaining what you are missing is one
              with extra steps. */}
          {insightsAdapter && subscribed && (
          <IconButton
            icon="avoidance"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("avoidance.open")}
            onClick={() => setAvoidanceOpen(true)}
            size="md"
          />
          )}
          {/* Only when there is something to install: gone inside the installed app, and gone in
              any browser that cannot install at all. iOS has no prompt to fire — so there the
              button opens the directions instead. */}
          {canInstall && (
          <IconButton
            icon="download"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.install")}
            onClick={() => {
              if (needsManualSteps) {
                setInstallSteps(true);
              } else {
                void install();
              }
            }}
            size="md"
          />
          )}
          {/* Beside Print, because they are the same intent — this week, out of the app and in
              front of somebody else. Hidden entirely without a backend: a demo board cannot mint
              a link, and a Share button that produced a URL nobody could open would be worse
              than no button. */}
          {shareAdapter && (
          <IconButton
            icon="share"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.share")}
            onClick={() => setSharing(true)}
            size="md"
          />
          )}
          <IconButton
            icon="print"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.print")}
            onClick={() => window.print()}
            size="md"
          />
          <Tooltip>
            <Tooltip.Trigger>
              <VisibilityFilter />
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" showArrow className={TOOLTIP_CLASSES}>
              {t("actions.visibility_filter")}
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip>
          {/* The shortcuts exist whether or not this is here; it is here so they are findable
              without knowing to press `?` first. */}
          <IconButton
            icon="keyboard"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("shortcuts.title")}
            onClick={openHelp}
            size="md"
          />
          <div data-tour="settings">
          <IconButton
            icon="settings"
            iconClass={ICON_BUTTON_CLASS}
            wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
            tooltip={t("actions.settings")}
            onClick={openSettingsModal}
            size="md"
          />
          </div>
        </div>
        {!accountUrl && signupUrl && (
          <>
            <span className="h-[22px] w-px bg-wp-border-strong" aria-hidden="true" />
            <SignupCallToAction signupUrl={signupUrl} loginUrl={loginUrl} />
          </>
        )}
        {accountUrl && (
          <>
            <span className="h-[22px] w-px bg-wp-border-strong" aria-hidden="true" />
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
          </>
        )}
      </div>

      <InstallModal isOpen={installSteps} onOpenChange={setInstallSteps} />
      <ShareWeekModal isOpen={sharing} onOpenChange={setSharing} />
      <FeedbackModal
        adapter={feedbackAdapter}
        isOpen={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
      <AvoidanceReportModal
        adapter={insightsAdapter}
        isOpen={avoidanceOpen}
        onOpenChange={setAvoidanceOpen}
      />
    </div>
  );
};

export default TopBar;
