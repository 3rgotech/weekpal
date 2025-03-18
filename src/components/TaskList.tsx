import React from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import NewTask from "./NewTask";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";

interface TaskProps {
  title: string;
  dayOfWeek: DayOfWeek;
}

const TaskList: React.FC<TaskProps> = ({ title, dayOfWeek }) => {
  const { currentWeek } = useCalendar();
  const { tasks } = useData();

  const { setNodeRef, isOver } = useDroppable({
    id: `${dayOfWeek}-droppable`,
    data: {
      dayOfWeek,
      type: "container",
    },
  });

  const filteredTasks = tasks.filter((task) => task.dayOfWeek === dayOfWeek);

  const taskIds = filteredTasks.map((task) => task.id)
    .filter((id) => id !== null && id !== undefined)
    .map((id) => `task-${id}`);

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg h-full border-blue-200 dark:border-blue-800 flex flex-col bg-white dark:bg-slate-800 shadow-sm`}
    >
      <TaskListHeader
        title={title}
        dayOfWeek={dayOfWeek}
        weekCode={currentWeek}
      />
      <ul className={clsx("flex-1 overflow-y-auto p-2 space-y-2")}>
        <SortableContext items={taskIds}>
          {filteredTasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              dayOfWeek={dayOfWeek}
            />
          ))}
        </SortableContext>
        {!isOver && <NewTask dayOfWeek={dayOfWeek} />}
      </ul>
    </div>
  );
};

export default TaskList;
