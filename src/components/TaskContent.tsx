import React from "react";
import { Chip } from "@heroui/react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import { subtaskProgressLabel } from "../utils/settings";

interface TaskContentProps {
  task: Task;
}

/**
 * What a task looks like, wherever it is listed: its category, its title, its progress.
 *
 * Shared by the draggable card on the wide board and the row on a phone. The two carry different
 * controls and different gestures, but a task that reads one way on a laptop and another on a
 * phone is two tasks as far as the person holding it is concerned.
 */
const TaskContent: React.FC<TaskContentProps> = ({ task }) => {
  const { t } = useTranslation();
  const { categories } = useData();
  const { settings } = useSettings();

  const category = categories.find((c) => c.id === task.categoryId);
  const { done, total } = task.subtaskProgress;
  const subtaskLabel = subtaskProgressLabel(settings.subtaskDisplay, done, total);

  return (
    <>
      {category && (
        <Chip
          size="sm"
          className={clsx(
            "shrink-0 text-xs rounded-md text-white",
            category.getColorClass("bg"),
            task.completed && "bg-opacity-60",
          )}
        >
          {category.name}
        </Chip>
      )}

      <h3
        className={clsx(
          "flex-1 min-w-0 text-sm font-medium truncate",
          task.completed && "text-slate-400 line-through dark:text-slate-400",
          !task.completed && category && category.getColorClass("text"),
        )}
      >
        {task.title}
      </h3>

      {subtaskLabel && (
        <span
          className={clsx(
            "shrink-0 text-xs tabular-nums",
            done === total ? "text-green-600" : "text-slate-400",
          )}
          title={t("task.subtasks.progress", { done, total })}
        >
          {subtaskLabel}
        </span>
      )}
    </>
  );
};

export default TaskContent;
