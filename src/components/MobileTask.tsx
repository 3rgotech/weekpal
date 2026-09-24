import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useTaskModal } from "../contexts/TaskModalContext";
import IconButton from "./IconButton";
import TaskContent from "./TaskContent";
import TaskMenu from "./TaskMenu";
import { useShortcuts } from "../contexts/ShortcutsContext";
import clsx from "clsx";

interface MobileTaskProps {
  task: Task;
}

/**
 * A task on the vertical board.
 *
 * A card, like the wide board's, with three controls always visible: tick it, open it, or move
 * it. The wide board hides its tick
 * button until the pointer is over the row and leaves everything else to dragging — neither
 * hovering nor dragging exists here, so every action a task has must be a target you can hit.
 */
const MobileTask: React.FC<MobileTaskProps> = ({ task }) => {
  const { t } = useTranslation();
  const { completeTask, uncompleteTask, openEscape } = useData();
  const { open } = useTaskModal();
  const { activeTaskId, setActiveTaskId } = useShortcuts();
  const rowRef = useRef<HTMLLIElement>(null);

  const isActive = activeTaskId === task.id;

  // A phone has no keyboard, but a tablet with one lands on this board in portrait.
  useEffect(() => {
    if (isActive) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <li
      ref={rowRef}
      className={clsx(
        "flex items-center gap-1.5 rounded-[10px] border py-2.5 pl-3 pr-2 bg-wp-card border-wp-border",
        isActive && "ring-2 ring-wp-accent",
      )}
      onPointerDown={() => setActiveTaskId(task.id)}
    >
      <div className="flex-1 flex items-center min-w-0">
        <TaskContent task={task} onOpenEscape={openEscape} size="md" />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <IconButton
          icon="check"
          iconClass={task.completed ? "text-wp-on-accent" : "text-wp-fg-secondary"}
          // Filled once ticked, in the accent rather than a green of its own: the board spends
          // colour on categories and on today, and a third meaning would compete with both.
          wrapperClass={clsx(
            "size-8 rounded-full border transition-colors duration-[120ms]",
            task.completed
              ? "bg-wp-accent border-wp-accent hover:bg-wp-accent"
              : "border-wp-border-strong",
          )}
          onClick={() => (task.completed ? uncompleteTask(task) : completeTask(task))}
          size="sm"
          tooltip={task.completed ? t("actions.uncomplete_task") : t("actions.complete_task")}
        />
        <IconButton
          icon="edit"
          onClick={() => open(task)}
          size="sm"
          tooltip={t("actions.edit_task")}
          wrapperClass="size-8 rounded-full border border-wp-border-strong"
        />
        <TaskMenu
          task={task}
          size={16}
          triggerClassName="inline-flex h-8 w-[26px] items-center justify-center rounded-full"
        />
      </div>
    </li>
  );
};

export default MobileTask;
