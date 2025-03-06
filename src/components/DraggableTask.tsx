import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "../contexts/DataContext";
import { DayOfWeek, WeekTaskList } from "../types";
import { Chip } from "@heroui/react";
import { Check } from "lucide-react";
import IconButton from "./IconButton";
import Task from "../data/task";
import clsx from "clsx";
interface DraggableTaskProps {
  task: Task;
  dayOfWeek: DayOfWeek;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayOfWeek }) => {
  const { completeTask, uncompleteTask, categories } =
    useData();
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
      dayOfWeek,
    },
  });

  const category = categories.find((c) => c.id === task.categoryId);

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
        className={clsx(
          "group flex items-center justify-between px-1 py-1 border rounded-lg h-10",
          !task.completed && category && category.getColorClass('border')
        )}
      >
        <div {...attributes} {...listeners}
          className="flex-1 flex items-center gap-x-1 overflow-hidden" style={{ cursor }}>
          {category && (
            <Chip size="sm" className={clsx("text-xs rounded-md text-white", category.getColorClass('bg'))}>{category.name}</Chip>
          )}
          <h3 className={clsx(
            "text-sm font-medium truncate",
            task.completed && "text-gray-400 line-through",
            !task.completed && category && category.getColorClass('text')
          )}>
            {task.title}
          </h3>
        </div>
        <div className="group-hover:flex hidden items-center gap-x-1">
          <IconButton icon="check"
            className={clsx(task.completed && 'bg-green-500')}
            color={task.completed ? 'white' : 'currentColor'}
            onClick={() => {
              if (task.completed) {
                uncompleteTask(task);
              } else {
                completeTask(task);
              }
            }} size="xs" />
        </div>
      </li>
    </>
  );
};

export default DraggableTask;
