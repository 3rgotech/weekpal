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
  /**
   * Extra classes for the row itself.
   *
   * On the `<li>` rather than on a wrapper, and that is the whole point of the prop: the FLIP and
   * the hidden-below count both read the list's *direct children*, so anything put between the
   * `<ul>` and this row makes both of them silently measure nothing.
   */
  className?: string;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayOfWeek, projectId, className }) => {
  const { completeTask, uncompleteTask, openEscape } = useData();
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
    boxShadow: isDragging ? "0 12px 32px var(--wp-shadow)" : undefined,
  };

  return (
    <>
      <li
        ref={(node) => {
          setNodeRef(node);
          rowRef.current = node;
        }}
        style={style}
        // What the FLIP reads to know where this row was a moment ago. On the `<li>` because
        // that is the child the list actually lays out.
        data-flip-key={task.id}
        className={clsx(
          className,
          "group flex items-center gap-2.5 rounded-lg border py-2.5 pl-3 pr-2.5 transition-colors",
          "bg-wp-card border-wp-border hover:bg-wp-card-hover hover:border-wp-border-strong",
          isActive && "ring-2 ring-wp-accent",
        )}
        // Pointing at a task with the mouse and then acting on it with the keyboard is one
        // gesture, not two: clicking anywhere on the row selects it.
        onPointerDown={() => setActiveTaskId(task.id)}
      >
        <div
          {...attributes}
          {...listeners}
          className="flex flex-1 min-w-0 items-center focus:outline-hidden"
          style={{ cursor }}
        >
          <TaskContent task={task} onOpenEscape={openEscape} />
        </div>
        {/* On hover only, and kept in the layout while hidden so the title does not re-wrap
            the moment the pointer arrives. */}
        <div className="invisible group-hover:visible group-focus-within:visible">
          <IconButton
            icon="check"
            iconClass={task.completed ? "text-wp-on-accent" : "text-wp-fg-secondary"}
            // Fills rather than switches: 120ms, the first beat of the ceremony, and the one
            // the finger is still on.
            wrapperClass={clsx(
              "size-[26px] rounded-full border transition-colors duration-[120ms]",
              task.completed
                ? "bg-wp-accent border-wp-accent hover:bg-wp-accent"
                : "border-wp-border-strong hover:bg-wp-track",
            )}
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
      </li>
    </>
  );
};

export default DraggableTask;
