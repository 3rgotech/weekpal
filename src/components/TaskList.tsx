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
  dayNumber: DayOfWeek;
}

const TaskList: React.FC<TaskProps> = ({ title, dayNumber }) => {
  const { currentWeekNumber } = useCalendar();
  const { tasks, selectedCategory } = useData();

  const { setNodeRef, isOver } = useDroppable({
    id: `${dayNumber}-droppable`,
    data: {
      dayNumber,
      type: "container",
    },
  });

  const filteredTasks = tasks.filter(
    (task) => task.dayOfWeek === dayNumber &&
      (selectedCategory === null || task.categoryId === selectedCategory)
  );

  const taskIds = filteredTasks.map((task) => task.id);

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg flex flex-col h-full border-gray-100`}
    >
      <TaskListHeader
        title={title}
        dayNumber={dayNumber}
        weekNumber={currentWeekNumber}
      />
      <ul className={clsx("flex-grow space-y-2 overflow-y-auto p-2", isOver && "border-2 border-dashed border-blue-500 animate-pulse bg-blue-50")}>
        <SortableContext items={taskIds}>
          {filteredTasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              dayNumber={dayNumber}
            />
          ))}
        </SortableContext>
        {!isOver && <NewTask dayNumber={dayNumber} />}
      </ul>
    </div>
  );
};

export default TaskList;
