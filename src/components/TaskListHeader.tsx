import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";
import clsx from "clsx";
import CapacityCount from "./CapacityCount";
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

  return (
    <div
      className={clsx(
        "pb-2 xl:pb-3 border-b-2",
        isToday ? "border-sky-500 text-sky-500" : "border-slate-200"
      )}
    >
      <div className="flex items-center">
      {/* Balanced against the menu button on the other side, so the heading stays centred
          whether or not a limit is set. */}
      <CapacityCount gauges={gauges} />
      {/* Beside the capacity count, on the same side: both are facts about the column rather
          than about the day's name, and putting one either side of the heading would pull the
          title off centre on exactly the columns that already draw the eye. */}
      <PastDayRecovery dayOfWeek={dayOfWeek} count={unfinished} />
      {/* One or the other, never both: they are two readings of the same fact, and a header
          carrying "~6h+ planned · 3 unestimated" beside "~6h / ~4h free" is arithmetic homework.
          The hours version wins where it can be computed, because it is the one that knows about
          the calendar. */}
      {/* The gauge is the trigger. *(rt §5)* Batch estimation is reached from the day header —
          from the number it is about to change — rather than from a menu item that would have to
          explain itself. A plain span when there is nothing to estimate, so a fully sized day
          offers no button to press. */}
      {onEstimate ? (
        <button
          type="button"
          onClick={onEstimate}
          aria-pressed={estimating}
          title={t("estimate.batch")}
          className={clsx(
            "shrink-0 rounded px-1 -mx-1 hover:bg-slate-200 dark:hover:bg-sky-900",
            "focus-visible:outline-2 focus-visible:outline-sky-500",
            estimating && "ring-2 ring-sky-500",
          )}
        >
          {hours !== null
            ? <DayHoursGauge hours={hours} />
            : <DayEstimate tasks={estimateOf} />}
        </button>
      ) : (
        hours !== null
          ? <DayHoursGauge hours={hours} />
          : <DayEstimate tasks={estimateOf} />
      )}
      {/* Both lines truncate rather than wrap. A tablet-width column turned "26 AUGUST 2026" into
          three lines, and three-line headers pushed the day's own tasks out of a grid row whose
          height is fixed — the list under Sunday was clipped mid-sentence. */}
      <h2 className="flex-1 min-w-0 text-center leading-tight">
        <span className="block truncate text-sm xl:text-lg">{day}</span>
        <span className="block truncate text-xs xl:text-base uppercase">{date}</span>
      </h2>
      {/* TODO : Add menu */}
      <IconButton
        icon="verticalDots"
        onClick={() => {
          openNewTask(weekCode, dayOfWeek);
        }}
        size="md"
        iconClass={isToday ? "text-sky-500" : "text-sky-950 dark:text-white"}
        wrapperClass={"border-0"}
      />
      </div>

      {/* Under the name rather than behind the tasks: *(rt §10)* nothing is painted behind text,
          because a wash is a readability tax paid all day for a signal wanted for one second. */}
      <DayShareBar share={share} level={worstGauge(gauges)?.level ?? "ok"} />
    </div>
  );
};

export default TaskListHeader;
