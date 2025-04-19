import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "../contexts/DataContext";
import { DayOfWeek, WeekTaskList } from "../types";
import { Chip } from "@heroui/react";
import IconButton from "./IconButton";
import Task from "../data/task";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
interface DraggableTaskProps {
  task: Task;
  dayOfWeek?: DayOfWeek;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayOfWeek }) => {
  const { completeTask, uncompleteTask, categories } = useData();
  const { t } = useTranslation();
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

  const cursor = isDragging ? "grabbing" : "grab";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? "0px 4px 10px rgba(0,0,0,0.2)" : "none",
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        className={clsx(
          "group flex items-center justify-between h-10 rounded-md transition-colors"
        )}
      >
        <div className="flex-1 flex items-center gap-x-2 h-10 px-2 py-1.5 overflow-hidden focus:outline-none border-b border-slate-200">
          <div
            {...attributes}
            {...listeners}
            className="flex flex-1 items-center gap-x-1"
            style={{ cursor }}
          >
            {category && (
              <Chip
                size="sm"
                className={clsx(
                  "text-xs rounded-md text-white",
                  category.getColorClass("bg"),
                  task.completed && "bg-opacity-60"
                )}
              >
                {category.name}
              </Chip>
            )}
            <h3
              className={clsx(
                "text-sm font-medium truncate",
                task.completed &&
                "text-slate-400 line-through dark:text-slate-400",
                !task.completed && category && category.getColorClass("text")
              )}
            >
              {task.title}
            </h3>
          </div>
          <div className="group-hover:flex hidden items-center">
            <IconButton
              icon="check"
              iconClass={task.completed ? "text-white" : ""}
              wrapperClass={task.completed ? "bg-green-500" : ""}
              onClick={() => {
                if (task.completed) {
                  uncompleteTask(task);
                } else {
                  completeTask(task);
                }
              }}
              size="xs"
              tooltip={task.completed ? t("actions.uncomplete_task") : t("actions.complete_task")}
              tooltipPosition="left"
            />
          </div>
        </div>
      </li>
    </>
  );
};

export default DraggableTask;
