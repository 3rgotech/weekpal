import React from "react";
import { Clock3 } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import { subtaskProgressLabel } from "../utils/settings";
import DeferralBadge from "./DeferralBadge";
import CategoryTag from "./CategoryTag";
import { formatEstimate } from "../utils/estimate";
import { deferralTier } from "../utils/deferral";

interface TaskContentProps {
  task: Task;
  /** Opens R20's three doors from the deferral badge. Absent where the card is not interactive. */
  onOpenEscape?: (task: Task) => void;
  /** `md` on a phone, where the row is the whole width and a thumb is doing the reading. */
  size?: "sm" | "md";
}

/**
 * What a task looks like, wherever it is listed: its title, and under it a line of what is known
 * about it — category, rough length, how often it has moved, subtask progress.
 *
 * Shared by the draggable card on the wide board and the row on a phone. The two carry different
 * controls and different gestures, but a task that reads one way on a laptop and another on a
 * phone is two tasks as far as the person holding it is concerned.
 */
const TaskContent: React.FC<TaskContentProps> = ({ task, onOpenEscape, size = "sm" }) => {
  const { t } = useTranslation();
  const { categories, focusedCategory, toggleFocusCategory } = useData();
  const { settings } = useSettings();

  const category = categories.find((c) => c.id === task.categoryId);
  const isFocused = category !== undefined && focusedCategory === category.id;
  const { done, total } = task.subtaskProgress;
  const subtaskLabel = subtaskProgressLabel(settings.subtaskDisplay, done, total);

  const estimate = formatEstimate(task.estimatedMinutes)?.replace(/^~/, "") ?? null;
  const hasMeta = category !== undefined || estimate !== null || subtaskLabel !== null
    || (!task.completed && deferralTier(task.deferralCount) !== "none");

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
      {/* The strike is on an inner span, not on the heading: the heading is a `-webkit-box` for
          its line clamp, and a gradient painted on that would be one box rather than one per
          line. Inline, it strikes every line of a wrapped title at once. */}
      <h3
        className={clsx(
          "min-w-0 leading-[1.4] font-medium line-clamp-3 break-words",
          size === "md" ? "text-sm" : "text-[13px]",
          task.completed ? "text-wp-muted" : "text-wp-fg",
        )}
      >
        <span className={clsx("task-strike", task.completed && "task-strike--done")}>
          {task.title}
        </span>
      </h3>

      {hasMeta && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {category && (
            /* The one-tap way into focus mode, and back out of it.
               `stopPropagation` on the pointer press rather than only on the click: on the wide
               board this tag sits inside the drag handle, and dnd-kit starts a drag — and, under
               the 10px threshold, opens the task — from `pointerdown`. Left alone, tapping the
               tag opened the task instead of focusing its category. */
            <button
              type="button"
              className={clsx(
                "shrink-0 rounded cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-wp-accent",
                isFocused && "ring-2 ring-offset-1 ring-wp-accent ring-offset-wp-card",
              )}
              aria-pressed={isFocused}
              aria-label={isFocused
                ? t("category.focus_exit")
                : t("category.focus", { name: category.name })}
              title={isFocused
                ? t("category.focus_exit")
                : t("category.focus", { name: category.name })}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                toggleFocusCategory(category.id);
              }}
            >
              <CategoryTag category={category} faded={task.completed} />
            </button>
          )}

          {estimate && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-wp-muted tabular-nums">
              <Clock3 size={11} aria-hidden="true" />
              {estimate}
            </span>
          )}

          {/* A fact about the task rather than about its contents. A completed task shows
              nothing — the count is about what is still being avoided, and a finished one no
              longer is. */}
          {!task.completed && (
            <DeferralBadge task={task} onOpenEscape={onOpenEscape} />
          )}

          {subtaskLabel && (
            <span
              className={clsx(
                "shrink-0 text-[11px] font-medium tabular-nums",
                done === total ? "text-green-600 dark:text-green-400" : "text-wp-muted",
              )}
              title={t("task.subtasks.progress", { done, total })}
            >
              {subtaskLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskContent;
