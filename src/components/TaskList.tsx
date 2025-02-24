import React from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import NewTask from "./NewTask";
import { useCalendar } from "../contexts/CalendarContext";

interface TaskProps {
  title: string;
  dayNumber: DayOfWeek;
}

const TaskList: React.FC<TaskProps> = ({ title, dayNumber }) => {
  const { currentWeekNumber } = useCalendar();
  const { tasks } = useData();

  const { isOver, setNodeRef } = useDroppable({
    id: "day-" + dayNumber,
    data: {
      type: "container",
      dayNumber,
    },
  });

  const taskList = tasks.filter((task) => task.dayOfWeek === dayNumber);

  return (
    <>
      <TaskListHeader
        title={title}
        dayNumber={dayNumber}
        weekNumber={currentWeekNumber}
      />
      <div ref={setNodeRef}>
        <ul className={`p-1 overflow-y-auto flex flex-col items-stretch gap-y-1 ${isOver ? "bg-gray-100" : ""}`}>
          <SortableContext items={taskList.map((task) => task.id)}>
            {taskList.map((task) => (
              <DraggableTask key={task.id} task={task} dayNumber={dayNumber} />
            ))}
          </SortableContext>
          <NewTask dayNumber={dayNumber} />
        </ul>
      </div>
    </>
  );
};

export default TaskList;
