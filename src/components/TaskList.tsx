import React, { useContext, useEffect, useRef, useState } from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { DataContext } from "../contexts/DataContext";
import { WeekTaskList } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import { Plus } from "lucide-react";
import IconButton from "./IconButton";
import NewTask from "./NewTask";

interface TaskProps {
  title: string;
  dayNumber: keyof WeekTaskList;
}

const TaskList: React.FC<TaskProps> = ({ title, dayNumber }) => {
  const { tasks, currentWeekNumber, addTask } =
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
        <ul className={`p-1 overflow-y-auto flex flex-col items-stretch gap-y-1 ${isOver ? "bg-gray-100" : ""}`}>
          <SortableContext items={taskList.map((task) => task.id)}>
            {taskList.map((task) => (
              <DraggableTask key={task.id} task={task} dayNumber={dayNumber} />
            ))}
            {/* TODO : Add task button */}
          </SortableContext>
          <NewTask dayNumber={dayNumber} />
        </ul>
      </div>
    </>
  );
};

export default TaskList;
