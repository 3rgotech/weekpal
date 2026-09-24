import React from "react";
import clsx from "clsx";
import { Archive, CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { weekHeaderLabel } from "../utils/settings";
import { boardDayOrder } from "../utils/week";
import IconButton from "./IconButton";
import { useData } from "../contexts/DataContext";
import { isDayDone } from "../utils/dayDone";
import WeekMark from "./WeekMark";
import { isWeekDone } from "../utils/weekDone";

interface DayNavProps {
  visibleDay: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
}

/**
 * The bottom bar of the vertical board: which day you are looking at, and which week it is in.
 *
 * Up to nine buckets in a row that has to fit a phone, so each cell is the shortest thing that
 * still says which is which — two letters and the date for the weekdays, the letters from the
 * locale rather than sliced off an English name, and initials with an icon for the two undated
 * buckets. Hiding days makes the row shorter
 * rather than the pills wider than they need to be.
 *
 * At the bottom because that is where a thumb is. The week controls sit above the pills: changing
 * week is the rarer move, and putting it in the same row would have cost the days their width.
 */
const DayNav: React.FC<DayNavProps> = ({ visibleDay, onSelect }) => {
  const { allTasks } = useData();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  const { currentDate, dateOf, layout, goToPreviousWeek, goToNextWeek, goToToday } = useCalendar();

  const today = dayjs();

  // The same buckets the wide board draws, in the same order — days the user has hidden are not
  // reachable there, and a pill for one here would be the only way into a column that is gone.
  const buckets = boardDayOrder(layout);

  const label = (day: DayOfWeek): string => {
    if (day === "0") {
      return t("main.this_week_short");
    }

    if (day === "someday") {
      return t("main.some_day_short");
    }

    return dateOf(day)?.format("dd") ?? "";
  };

  // The label carries two parts — "Week 39" and the rest — split the same way the wide bar's
  // selector splits it, so the week number can be the bold half.
  const [weekTitle, weekRange] = weekHeaderLabel(
    dayjs(currentDate).format(settings.weekHeaderFormat),
    { week: t("misc.week"), of: t("misc.of") },
  ).split(" - ");

  const isToday = (day: DayOfWeek): boolean => dateOf(day)?.isSame(today, "day") ?? false;

  /*
   * Weekdays only. "Some day is done" is not a thing that can be true, and the this-week bucket
   * is the overflow the other columns drain into rather than a day anyone gets through.
   */
  const isDone = (day: DayOfWeek): boolean =>
    day !== "0" && day !== "someday" && isDayDone(allTasks, day);

  const isBucket = (day: DayOfWeek): boolean => day === "0" || day === "someday";

  const pill = (day: DayOfWeek) => {
    const selected = visibleDay === day;
    const BucketIcon = day === "0" ? CalendarRange : Archive;

    return (
      <button
        key={day}
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(day)}
        className={clsx(
          "flex-1 min-w-0 h-[46px] flex flex-col items-center justify-center rounded-[10px] cursor-pointer transition-colors",
          isBucket(day) ? "gap-[3px]" : "gap-px",
          selected ? "bg-wp-accent" : "hover:bg-wp-track",
        )}
      >
        <span
          className={clsx(
            "text-[10px] font-bold uppercase tracking-[0.4px] leading-none",
            selected ? "text-wp-on-accent" : "text-wp-muted",
          )}
        >
          {label(day)}
        </span>
        {isBucket(day) ? (
          <BucketIcon size={15} aria-hidden="true" className={selected ? "text-wp-on-accent" : "text-wp-fg"} />
        ) : (
          /* *(rt §3)* The mobile half of the day strike. A one-day board cannot show the week, so
             this strip is the week — and striking the date of a finished day turns it into a
             seven-notch ledger you can read at a glance without leaving the day you are on.

             `line-through` rather than the drawn diagonal: at this size a diagonal is a smudge,
             and the drawing is the ceremony for the day you are looking at rather than for six
             you are not. Today keeps the accent when another day is selected, so the week never
             becomes a row of interchangeable cells. */
          <span
            aria-hidden="true"
            className={clsx(
              "text-[15px] font-bold leading-tight tabular-nums",
              selected ? "text-wp-on-accent" : isToday(day) ? "text-wp-accent" : "text-wp-fg",
              isDone(day) && "line-through decoration-2",
            )}
          >
            {dateOf(day)?.format("D")}
          </span>
        )}
      </button>
    );
  };

  const firstBucket = buckets.findIndex(isBucket);

  return (
    /* The bar's background runs to the bottom edge; its contents stop above the home indicator.
       Padding rather than a margin, so the colour still fills the strip iOS reserves. */
    <nav className="flex-none flex flex-col gap-2.5 px-2.5 pt-2.5 pb-[calc(16px+env(safe-area-inset-bottom))] border-t border-wp-border bg-wp-chrome" data-tour="days">
      <div className="flex items-center justify-between">
        <IconButton
          icon="chevronLeft"
          onClick={goToPreviousWeek}
          size="sm"
          tooltip={t("actions.previous_week")}
          wrapperClass="size-8 rounded-full"
        />
        <button
          type="button"
          onClick={() => {
            // Jumping to this week and staying on Thursday because that is where you happened to
            // be reads as nothing having happened. Today's week, today's day — unless today is a
            // day this user has hidden, in which case the undated bucket is the honest landing
            // place rather than a column that is not on screen.
            const day = `${today.isoWeekday()}` as DayOfWeek;

            goToToday();
            onSelect(buckets.includes(day) ? day : "0");
          }}
          className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5 text-sm truncate cursor-pointer"
        >
          <span className="shrink-0 font-bold text-wp-fg">{weekTitle}</span>
          {weekRange && <span className="truncate font-medium text-wp-fg-secondary">{weekRange}</span>}
        </button>
        <IconButton
          icon="chevronRight"
          onClick={goToNextWeek}
          size="sm"
          tooltip={t("actions.next_week")}
          wrapperClass="size-8 rounded-full"
        />
      </div>

      <div className="relative flex items-center gap-[3px]">
        {/* R9 on a phone: the strip is the only place the week still exists, so the rule that
            joins the finished days runs above it. */}
        <WeekMark done={isWeekDone(allTasks, layout.visible)} shape="rule" />
        {buckets.map((day, index) => (
          <React.Fragment key={day}>
            {/* The dated days and the two undated buckets are different kinds of place; a rule
                between them says so without spending width on a label. */}
            {index === firstBucket && index > 0 && (
              <span className="h-7 w-px shrink-0 bg-wp-border-strong" aria-hidden="true" />
            )}
            {pill(day)}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default DayNav;
