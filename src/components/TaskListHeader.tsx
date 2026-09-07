import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";
import clsx from "clsx";
import CapacityCount from "./CapacityCount";
import { Gauge } from "../utils/capacity";

interface TaskListHeaderProps {
  title: string;
  dayOfWeek: DayOfWeek;
  weekCode: string;
  isToday: boolean;
  /** What this column is measured against — the day, and any limited category in it. */
  gauges?: Gauge[];
}

const TaskListHeader: React.FC<TaskListHeaderProps> = ({
  title,
  dayOfWeek,
  weekCode,
  isToday,
  gauges = [],
}) => {
  const { openNewTask } = useTaskModal();

  const [day, date] = title.split(" | ");

  return (
    <div
      className={clsx(
        "flex items-center pb-2 xl:pb-3 border-b-2",
        isToday ? "border-sky-500 text-sky-500" : "border-slate-200"
      )}
    >
      {/* Balanced against the menu button on the other side, so the heading stays centred
          whether or not a limit is set. */}
      <CapacityCount gauges={gauges} />
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
  );
};

export default TaskListHeader;
