import React from "react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useTaskModal } from "../contexts/TaskModalContext";
import IconButton from "./IconButton";
import TaskContent from "./TaskContent";
import TaskMenu from "./TaskMenu";

interface MobileTaskProps {
  task: Task;
}

/**
 * A task on the vertical board.
 *
 * Three controls, always visible: tick it, open it, or move it. The wide board hides its tick
 * button until the pointer is over the row and leaves everything else to dragging — neither
 * hovering nor dragging exists here, so every action a task has must be a target you can hit.
 */
const MobileTask: React.FC<MobileTaskProps> = ({ task }) => {
  const { t } = useTranslation();
  const { completeTask, uncompleteTask } = useData();
  const { open } = useTaskModal();

  return (
    <li className="flex items-center gap-2 min-h-12 px-2 py-2 border-b border-slate-200 dark:border-slate-600">
      <div className="flex-1 flex items-center gap-x-2 min-w-0">
        <TaskContent task={task} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          icon="check"
          iconClass={task.completed ? "text-white" : ""}
          wrapperClass={task.completed ? "bg-green-500" : ""}
          onClick={() => (task.completed ? uncompleteTask(task) : completeTask(task))}
          size="sm"
          tooltip={task.completed ? t("actions.uncomplete_task") : t("actions.complete_task")}
        />
        <IconButton
          icon="edit"
          onClick={() => open(task)}
          size="sm"
          tooltip={t("actions.edit_task")}
          iconClass="text-sky-950 dark:text-white"
        />
        <TaskMenu task={task} size={20} />
      </div>
    </li>
  );
};

export default MobileTask;
