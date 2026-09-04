import React, { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import Task from "../data/task";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import TaskContent from "./TaskContent";
import { useShortcuts } from "../contexts/ShortcutsContext";
interface DraggableTaskProps {
  task: Task;
  dayOfWeek?: DayOfWeek;
  /** Set in the projects drawer: the task is in this project's backlog rather than in a day. */
  projectId?: string;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayOfWeek, projectId }) => {
  const { completeTask, uncompleteTask } = useData();
  const { t } = useTranslation();
  const { activeTaskId, setActiveTaskId } = useShortcuts();
  const rowRef = useRef<HTMLLIElement>(null);

  const isActive = activeTaskId === task.id;

  // `j` and `k` walk the whole week, including the columns that are scrolled out of sight —
  // a selection you cannot see is worse than none.
  useEffect(() => {
    if (isActive) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);
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
      // Carried so a drop *on a backlog task* lands in that task's project, the same way a drop
      // on a day's task lands in that day.
      projectId,
    },
  });

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
        ref={(node) => {
          setNodeRef(node);
          rowRef.current = node;
        }}
        style={style}
        className={clsx(
          "group flex items-center justify-between min-h-10 rounded-md transition-colors",
          isActive && "ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-900/40"
        )}
        // Pointing at a task with the mouse and then acting on it with the keyboard is one
        // gesture, not two: clicking anywhere on the row selects it.
        onPointerDown={() => setActiveTaskId(task.id)}
      >
        <div className="flex-1 flex items-center gap-x-2 min-h-10 px-2 py-1.5 overflow-hidden focus:outline-hidden border-b border-slate-200">
          <div
            {...attributes}
            {...listeners}
            className="flex flex-1 items-center gap-x-1"
            style={{ cursor }}
          >
            <TaskContent task={task} />
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
