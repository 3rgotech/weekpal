import React, { useRef, useState } from "react";
import { useData } from "../contexts/DataContext";
import Task from "../data/task";
import { DayOfWeek, WeekTaskList } from "../types";
import IconButton from "./IconButton";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface NewTaskProps {
  dayOfWeek: DayOfWeek;
}

const NewTask = ({ dayOfWeek }: NewTaskProps) => {
  const { currentWeek } = useCalendar();
  const { addTask } = useData();
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
      const task = Task.create(
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
    <li
      className={clsx(
        `flex items-center justify-between h-10 rounded-md cursor-text`
      )}
    >
      <div
        ref={wrapperRef}
        className="flex w-full items-center py-2 px-2 border-b border-slate-200"
        onFocusCapture={(e) => {
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
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCancel();
                } else if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
              className="w-full ring-0 outline-none bg-transparent text-sm font-medium mt-[3px]"
            />
            <IconButton
              icon="plus"
              onClick={handleSubmit}
              size="xs"
              iconClass={"text-sky-950 dark:text-white"}
              wrapperClass={"border-slate-200 dark:border-sky-900"}
              tooltip={t("actions.add_task")}
              tooltipPosition="left"
            />
          </>
        ) : (
          <button
            className="text-sm text-slate-400 dark:text-slate-400 h-full mt-[3px] w-full text-left cursor-text"
            onClick={() => setCreatingNewTask(true)}
          >
            {t("main.add_new_task")}
          </button>
        )}
      </div>
    </li>
  );
};

export default NewTask;
