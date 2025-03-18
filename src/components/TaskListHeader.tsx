import React from "react";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useTaskModal } from "../contexts/TaskModalContext";

interface TaskListHeaderProps {
  title: string;
  dayOfWeek: DayOfWeek;
  weekCode: string;
}

const TaskListHeader: React.FC<TaskListHeaderProps> = ({ title, dayOfWeek, weekCode }) => {
  const { openNewTask } = useTaskModal();

  return (
    <div className="border-b border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-slate-700">
      <div className="px-3 py-2 flex items-center justify-between">
        <h2 className="text-lg font-medium text-sky-700 dark:text-sky-200">
          {title}
        </h2>
        <IconButton icon="plus" onClick={() => { openNewTask(weekCode, dayOfWeek) }} size="sm" />
      </div>
    </div>
  );
};

export default TaskListHeader;
