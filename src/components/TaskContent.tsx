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
            task.completed ? category.getColorClass("bgFaded") : category.getColorClass("bg"),
          )}
        >
          <Chip.Label>{category.name}</Chip.Label>
        </Chip>
      )}

      {/* Two lines rather than one truncated one, and three in the band where the seven columns
          are at their narrowest — about 165px between `lg` and `xl`, where even two lines cut the
          longer titles mid-word. A column there has vertical room to spare and none to waste
          horizontally. `lg:max-xl:` is that band exactly: narrower than `lg` is the vertical
          layout, where a row has the full width and never needs any of this. */}
      <h3
        className={clsx(
          "flex-1 min-w-0 text-sm lg:max-xl:text-xs font-medium line-clamp-2 lg:max-xl:line-clamp-3 break-words",
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
