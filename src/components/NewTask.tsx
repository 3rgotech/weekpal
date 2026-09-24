import React, { useRef, useState } from "react";
import { useData } from "../contexts/DataContext";
import Task, { SomedayTask } from "../data/task";
import { DayOfWeek } from "../types";
import IconButton from "./IconButton";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NewTaskProps {
  /** Which bucket on the board the task lands in. Absent for a project's backlog, which is not
      one of the board's buckets — it has no week at all. */
  dayOfWeek?: DayOfWeek;
  /** Set in the projects drawer: the new task joins this project's backlog. */
  projectId?: string;
}

const NewTask = ({ dayOfWeek, projectId }: NewTaskProps) => {
  const { currentWeek } = useCalendar();
  const { addTask, projects } = useData();
  const { t } = useTranslation();
  const [creatingNewTask, setCreatingNewTask] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCancel = () => {
    setCreatingNewTask(false);
    setInputValue("");
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      // A backlog task is a task with no week that names a project. It takes the project's
      // category straight away, which is the rule the backend applies anyway.
      const project = projectId ? projects.find((p) => p.id === projectId) ?? null : null;

      const task = projectId
        ? new SomedayTask({
          title: inputValue,
          projectId,
          categoryId: project?.categoryId ?? null,
        })
        : Task.create(
          dayOfWeek === "someday" ? "someday" : "weekly",
          {
            title: inputValue,
            weekCode: currentWeek,
            dayOfWeek,
          }
        );
      if (task) {
        addTask(task);
        handleCancel();
        setTimeout(() => {
          setCreatingNewTask(true);
        }, 100);
      }
      setTimeout(() => {
        setCreatingNewTask(true);
      }, 100);
    }
  };

  const handleFocusOut = (e: React.FocusEvent) => {
    // Check if the next focused element is outside our component
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      handleCancel();
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        handleCancel();
      }
    };

    if (creatingNewTask) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [creatingNewTask]);

  return (
    <li className="list-none">
      <div
        ref={wrapperRef}
        className={clsx(
          "flex w-full items-center gap-2 rounded-lg border px-3 min-h-[34px] transition-colors",
          creatingNewTask
            ? "border-wp-accent bg-wp-card"
            : "border-wp-border hover:border-wp-border-strong hover:bg-wp-card-hover",
        )}
        onFocusCapture={() => {
          if (!creatingNewTask) setCreatingNewTask(true);
        }}
        onBlurCapture={handleFocusOut}
      >
        {creatingNewTask ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              placeholder={t("main.add_new_task")}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCancel();
                } else if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              className="w-full py-2 ring-0 outline-hidden bg-transparent text-[13px] font-medium text-wp-fg placeholder:text-wp-muted"
            />
            <IconButton
              icon="plus"
              onClick={handleSubmit}
              size="xs"
              tooltip={t("actions.add_task")}
              tooltipPosition="left"
            />
          </>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2 py-2 text-left text-[13px] font-medium text-wp-muted cursor-text"
            onClick={() => setCreatingNewTask(true)}
          >
            <Plus size={14} aria-hidden="true" />
            {t("main.add_new_task")}
          </button>
        )}
      </div>
    </li>
  );
};

export default NewTask;
