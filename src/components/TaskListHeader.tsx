import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";

interface TaskListHeaderProps {
  title: string;
  dayOfWeek: DayOfWeek;
  weekCode: string;
}

const TaskListHeader: React.FC<TaskListHeaderProps> = ({
  title,
  dayOfWeek,
  weekCode,
}) => {
  const { openNewTask } = useTaskModal();

  const [day, date] = title.split(" | ");

  return (
    <div className="flex items-center pb-4 border-b-2 border-slate-200">
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
        iconClass={"text-sky-950 dark:text-white"}
        wrapperClass={"border-0"}
      />
    </div>
  );
};

export default TaskListHeader;
