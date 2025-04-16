import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";
import clsx from "clsx";

interface TaskListHeaderProps {
  title: string;
  dayOfWeek: DayOfWeek;
  weekCode: string;
  isToday: boolean;
}

const TaskListHeader: React.FC<TaskListHeaderProps> = ({
  title,
  dayOfWeek,
  weekCode,
  isToday,
}) => {
  const { openNewTask } = useTaskModal();

  const [day, date] = title.split(" | ");

  return (
    <div
      className={clsx(
        "flex items-center pb-3 border-b-2",
        isToday ? "border-sky-500 text-sky-500" : "border-slate-200"
      )}
    >
      <h2 className="flex-1 text-center">
        <span className="text-lg leading-[4px]">{day}</span>
        <br />
        <span className="text-base leading-[4px] uppercase">{date}</span>
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
