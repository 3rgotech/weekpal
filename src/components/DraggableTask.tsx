import React, { useContext, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DataContext } from "../contexts/DataContext";
import { Task, WeekTaskList } from "../types";
import { Chip } from "@nextui-org/react";
import { Check } from "lucide-react";
import IconButton from "./IconButton";
interface DraggableTaskProps {
  task: Task;
  dayNumber: keyof WeekTaskList;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayNumber }) => {
  const { completeTask, uncompleteTask, categoryList } =
    useContext(DataContext);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: "task-" + task.id,
    animateLayoutChanges: ({ isSorting }) => (isSorting ? false : true),
    // Active une animation douce lors de la réorganisation
    data: {
      type: "task",
      id: task.id,
      currentOrder: task.order,
      dayNumber,
    },
  });
  const category = task.category ? categoryList.find((c) => c.id === task.category) : null;
  const cursor = isDragging ? 'grabbing' : 'grab';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1, // Effet semi-transparent lors du drag
    boxShadow: isDragging ? "0px 4px 10px rgba(0,0,0,0.2)" : "none", // Ombre pour effet de levitation
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between px-1 py-1 border rounded-lg"
      >
        <div {...attributes} {...listeners}
          className={`flex-1 flex items-center gap-x-1 overflow-hidden`} style={{ cursor }}>
          {category !== null && (
            <Chip size="sm" className="text-xs rounded-md">{category.label}</Chip>
          )}
          <h3 className="text-sm font-medium truncate">{task.title}</h3>
        </div>
        <div className="flex items-center gap-x-1">
          <IconButton icon={<Check />}
            className={task.completed_at !== null ? 'bg-green-500' : ''}
            onClick={() => {
              if (task.completed_at !== null) {
                uncompleteTask(dayNumber, task.id);
              } else {
                completeTask(dayNumber, task.id);
              }
            }} small />
        </div>
      </li>
    </>
  );
};

export default DraggableTask;
