import React from "react";
import { useCalendar } from "../contexts/CalendarContext";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { useTranslation } from "react-i18next";
import { ICON_BUTTON_CLASS, ICON_BUTTON_WRAPPER_CLASS } from "../utils/color";
import { weekHeaderLabel } from "../utils/settings";

const WeekSelector: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { currentDate, goToPreviousWeek, goToNextWeek, goToToday } =
    useCalendar();
  const dayjs = useDayJs(settings.language);

  const [title1, title2] = weekHeaderLabel(
    dayjs(currentDate).format(settings.weekHeaderFormat),
    { week: t("misc.week"), of: t("misc.of") },
  ).split(" - ");

  return (
    /* `data-tour` rather than a class or an id: the tour points at things by intent, and a
       selector written against styling breaks the first time the styling changes. */
    <div className="flex min-w-0 items-center gap-1" data-tour="week">
      <IconButton
        icon="chevronLeft"
        onClick={goToPreviousWeek}
        iconClass={ICON_BUTTON_CLASS}
        wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
        tooltip={t("actions.previous_week")}
      />
      <div className="flex min-w-0 items-baseline gap-2 px-1.5 truncate">
        <span className="shrink-0 text-[15px] font-bold text-wp-fg">{title1}</span>
        {title2 && <span className="truncate text-sm font-medium text-wp-fg-secondary">{title2}</span>}
      </div>
      <IconButton
        icon="chevronRight"
        onClick={goToNextWeek}
        iconClass={ICON_BUTTON_CLASS}
        wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
        tooltip={t("actions.next_week")}
      />
      <button
        type="button"
        onClick={goToToday}
        title={t("actions.this_week")}
        className="ml-1 shrink-0 rounded-lg border border-wp-border-strong px-3 py-1.5 text-xs font-semibold text-wp-fg cursor-pointer hover:bg-wp-track focus-visible:outline-2 focus-visible:outline-wp-accent"
      >
        {t("main.today")}
      </button>
    </div>
  );
};

export default WeekSelector;
