import React, { useContext } from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { DataContext } from "../contexts/DataContext";
import { WeekTaskList } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";

interface TaskProps {
  title: string;
  weekNumber: number;
  dayNumber: keyof WeekTaskList;
}

const TaskList: React.FC<TaskProps> = ({ title, weekNumber, dayNumber }) => {
  const { tasks, setTasks, setTasksStorage, currentWeekNumber } =
    useContext(DataContext);
  const { isOver, setNodeRef } = useDroppable({
    id: "day-" + dayNumber,
    data: {
      type: "container",
      dayNumber,
    },
  });
  const taskList = tasks[dayNumber] || [];

  return (
    <>
      <TaskListHeader
        title={title}
        dayNumber={dayNumber}
        weekNumber={currentWeekNumber}
      />
      <div ref={setNodeRef}>
        <SortableContext items={taskList.map((task) => task.id)}>
          <ul className={`p-1 overflow-y-auto flex flex-col items-stretch gap-y-1 ${isOver ? "bg-gray-100" : ""}`}>
            {taskList.map((task) => (
              <DraggableTask key={task.id} task={task} dayNumber={dayNumber} />
            ))}
            {/* TODO : Add task button */}
          </ul>
        </SortableContext>
      </div>
    </>
  );
};

export default TaskList;
