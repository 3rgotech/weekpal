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
    <div className="border-b rounded dark:border-gray-700">
      <div className="px-2 py-1 flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white">
          {title}
        </h2>
        <IconButton icon="plus" onClick={() => { openNewTask(weekCode, dayOfWeek) }} size="sm" />
      </div>
    </div>
  );
};

export default TaskListHeader;
