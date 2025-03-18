import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "../contexts/DataContext";
import { DayOfWeek, WeekTaskList } from "../types";
import { Chip } from "@heroui/react";
import IconButton from "./IconButton";
import Task from "../data/task";
import clsx from "clsx";
interface DraggableTaskProps {
  task: Task;
  dayOfWeek?: DayOfWeek;
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
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? "0px 4px 10px rgba(0,0,0,0.2)" : "none",
  };

  let borderClass = "border-slate-300 dark:border-slate-600";
  if (!task.completed && category) {
    borderClass = category.getColorClass('border') ?? borderClass;
  }

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={clsx(
          "group flex items-center justify-between px-2 py-1 border rounded-md h-10 shadow-sm transition-colors",
          "bg-white dark:bg-slate-700",
          borderClass
        )}
      >
        <div
          {...attributes} {...listeners}
          className="flex-1 flex items-center gap-x-2 overflow-hidden" style={{ cursor }}>
          {category && (
            <Chip size="sm" className={clsx("text-xs rounded-md text-white", category.getColorClass('bg'))}>{category.name}</Chip>
          )}
          <h3 className={clsx(
            "text-sm font-medium truncate",
            task.completed && "text-slate-300 line-through dark:text-slate-300",
            !task.completed && category && category.getColorClass('text')
          )}>
            {task.title}
          </h3>
        </div>
        <div className="group-hover:flex hidden items-center gap-x-1">
          <IconButton icon="check"
            color={task.completed ? 'green' : null}
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
