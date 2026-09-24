import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";
import clsx from "clsx";
import CapacityBar from "./CapacityBar";
import PastDayRecovery from "./PastDayRecovery";
import DayEstimate from "./DayEstimate";
import DayHoursGauge from "./DayHoursGauge";
import { DayHours } from "../utils/hours";
import Task from "../data/task";
import { useTranslation } from "react-i18next";
import { Gauge, worstGauge } from "../utils/capacity";
import DayShareBar from "./DayShareBar";

interface TaskListHeaderProps {
  title: string;
  dayOfWeek: DayOfWeek;
  weekCode: string;
  isToday: boolean;
  /** What this column is measured against — the day, and any limited category in it. */
  gauges?: Gauge[];
  /**
   * Unfinished tasks on a day that has already passed, or 0 for every other column.
   *
   * Passed in rather than computed here: the header is handed what to draw, and the question of
   * which days count as past belongs with the calendar.
   */
  unfinished?: number;
  /** The day's unfinished tasks, for the planned-hours line. */
  estimateOf?: Task[];
  /** Hours measured against what the calendar left, or null when the day cannot honestly be measured. */
  hours?: DayHours | null;
  /** Starts batch estimation for this column. Absent where there is nothing to estimate. */
  onEstimate?: () => void;
  /** True while this column is the one being estimated. */
  estimating?: boolean;
  /** This day's load against the heaviest day on screen, or null where there is nothing to compare. */
  share?: number | null;
}

const TaskListHeader: React.FC<TaskListHeaderProps> = ({
  title,
  dayOfWeek,
  weekCode,
  isToday,
  gauges = [],
  unfinished = 0,
  estimateOf = [],
  hours = null,
  onEstimate,
  estimating = false,
  share = null,
}) => {
  const { openNewTask } = useTaskModal();
  const { t } = useTranslation();

  const [day, date] = title.split(" | ");
  const isDay = dayOfWeek !== "0" && dayOfWeek !== "someday";
  const hasLimit = worstGauge(gauges) !== null;

  // One or the other, never both: they are two readings of the same fact, and a header
  // carrying "~6h+ planned · 3 unestimated" beside "~6h / ~4h free" is arithmetic homework. The
  // hours version wins where it can be computed, because it is the one that knows about the
  // calendar.
  const load = hours !== null
    ? <DayHoursGauge hours={hours} />
    : <DayEstimate tasks={estimateOf} />;

  const menu = (
    <IconButton
      icon="ellipsis"
      onClick={() => {
        openNewTask(weekCode, dayOfWeek);
      }}
      size="sm"
      iconClass="text-wp-muted"
      wrapperClass="rounded-md"
      aria-label={t("actions.add_task")}
    />
  );

  /*
   * The undated buckets: one line — name, how many, and what the bucket is for — since they have
   * no date and no day's load to carry.
   */
  if (!isDay) {
    const count = estimateOf.length;

    return (
      <div className="flex items-center justify-between gap-2 pt-3.5 pb-3 pl-4 pr-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="shrink-0 text-[15px] font-bold text-wp-fg">{title}</h2>
          <span className="shrink-0 rounded-full bg-wp-track px-2 py-0.5 text-[11px] font-bold leading-4 text-wp-fg-secondary tabular-nums">
            {count}
          </span>
          <span className="min-w-0 truncate text-xs text-wp-muted">
            {dayOfWeek === "0" ? t("main.this_week_hint") : t("main.some_day_hint")}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CapacityBar gauges={gauges} className="w-28" />
          {menu}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 pt-3.5 pb-3 pl-4 pr-2.5">
      <div className="flex items-start justify-between gap-2">
        {/* Both lines truncate rather than wrap. A tablet-width column turned "26 AUGUST 2026"
            into three lines, and three-line headers pushed the day's own tasks out of a grid row
            whose height is fixed. */}
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* Wraps rather than truncating: in a narrow column the pills drop under the name,
              where truncating would have eaten the name first and left "M…" beside them. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2
              className={clsx(
                "max-w-full truncate text-[15px] font-bold leading-tight",
                isToday ? "text-wp-accent" : "text-wp-fg-secondary",
              )}
            >
              {day}
            </h2>
            {isToday && (
              <span className="shrink-0 rounded-full bg-wp-accent px-2 py-0.5 text-[11px] font-bold leading-4 text-wp-on-accent">
                {t("main.today")}
              </span>
            )}
            {/* Beside the name: work left on a day that has passed is the one asymmetric mark
                in the week, and it belongs with the day it is about. */}
            <PastDayRecovery dayOfWeek={dayOfWeek} count={unfinished} />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-wp-muted">
            {date && <span className="truncate">{date}</span>}
            {/* The load is the trigger. *(rt §5)* Batch estimation is reached from the day
                header — from the number it is about to change — rather than from a menu item
                that would have to explain itself. A plain span when there is nothing to
                estimate, so a fully sized day offers no button to press. */}
            {onEstimate ? (
              <button
                type="button"
                onClick={onEstimate}
                aria-pressed={estimating}
                title={t("estimate.batch")}
                className={clsx(
                  "shrink-0 rounded px-1 -mx-0.5 cursor-pointer hover:bg-wp-track empty:hidden",
                  "focus-visible:outline-2 focus-visible:outline-wp-accent",
                  estimating && "ring-2 ring-wp-accent",
                )}
              >
                {load}
              </button>
            ) : load}
          </div>
        </div>
        {menu}
      </div>

      {/* Under the name rather than behind the tasks: *(rt §10)* nothing is painted behind text,
          because a wash is a readability tax paid all day for a signal wanted for one second.
          The slots when the day has a limit; otherwise the day's weight against the heaviest. */}
      {hasLimit
        ? <CapacityBar gauges={gauges} isToday={isToday} />
        : <DayShareBar share={share} level="ok" />}
    </div>
  );
};

export default TaskListHeader;
