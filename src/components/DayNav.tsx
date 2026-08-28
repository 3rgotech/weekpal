import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { weekHeaderLabel } from "../utils/settings";
import IconButton from "./IconButton";

interface DayNavProps {
  visibleDay: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
}

/**
 * The bottom bar of the vertical board: which day you are looking at, and which week it is in.
 *
 * Nine buckets in a row that has to fit a phone, so the labels are the shortest thing that still
 * says which is which — two letters for the weekdays, from the locale rather than sliced off an
 * English name, and initials for the two undated buckets.
 *
 * At the bottom because that is where a thumb is. The week controls sit above the pills: changing
 * week is the rarer move, and putting it in the same row would have cost the days their width.
 */
const DayNav: React.FC<DayNavProps> = ({ visibleDay, onSelect }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  const { currentDate, firstDayOfWeek, goToPreviousWeek, goToNextWeek, goToToday } = useCalendar();

  const today = dayjs();
  const weekdays: DayOfWeek[] = ["1", "2", "3", "4", "5", "6", "7"];

  const label = (day: DayOfWeek): string => {
    if (day === "0") {
      return t("main.this_week_short");
    }

    if (day === "someday") {
      return t("main.some_day_short");
    }

    return firstDayOfWeek.add(parseInt(day, 10) - 1, "day").format("dd");
  };

  const isToday = (day: DayOfWeek): boolean =>
    day !== "0"
    && day !== "someday"
    && firstDayOfWeek.add(parseInt(day, 10) - 1, "day").isSame(today, "day");

  const pill = (day: DayOfWeek) => (
    <button
      key={day}
      type="button"
      aria-current={visibleDay === day ? "true" : undefined}
      onClick={() => onSelect(day)}
      className={clsx(
        "flex-1 min-w-0 py-2 rounded-full text-xs font-semibold uppercase transition-colors",
        visibleDay === day
          ? "bg-sky-500 text-white"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-sky-900",
        // Today keeps its mark even when you are looking at another day, so the week never
        // becomes a row of interchangeable pills.
        visibleDay !== day && isToday(day) && "text-sky-500 dark:text-sky-400 underline",
      )}
    >
      {label(day)}
    </button>
  );

  return (
    <nav className="flex-none border-t border-slate-200 dark:border-sky-900 bg-slate-100 dark:bg-sky-950">
      <div className="flex items-center justify-between px-2 py-1">
        <IconButton
          icon="chevronLeft"
          onClick={goToPreviousWeek}
          size="sm"
          tooltip={t("actions.previous_week")}
          iconClass="text-sky-950 dark:text-white"
        />
        <button
          type="button"
          onClick={() => {
            // Jumping to this week and staying on Thursday because that is where you happened to
            // be reads as nothing having happened. Today's week, today's day.
            goToToday();
            onSelect(`${today.isoWeekday()}` as DayOfWeek);
          }}
          className="flex-1 text-center text-sm font-semibold dark:text-white truncate"
        >
          {weekHeaderLabel(
            dayjs(currentDate).format(settings.weekHeaderFormat),
            { week: t("misc.week"), of: t("misc.of") },
          )}
        </button>
        <IconButton
          icon="chevronRight"
          onClick={goToNextWeek}
          size="sm"
          tooltip={t("actions.next_week")}
          iconClass="text-sky-950 dark:text-white"
        />
      </div>

      <div className="flex items-stretch gap-0.5 px-1 pb-1">
        {weekdays.map(pill)}
        {pill("0")}
        {pill("someday")}
      </div>
    </nav>
  );
};

export default DayNav;
