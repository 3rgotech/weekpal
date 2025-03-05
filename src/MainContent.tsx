import React, { useState } from "react";
import TaskList from "./components/TaskList";
import { useData } from "./contexts/DataContext";
import { DayOfWeek } from "./types";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { useTaskModal } from "./contexts/TaskModalContext";
import { useCalendar } from "./contexts/CalendarContext";
import DraggableTask from "./components/DraggableTask";
import Task from "./data/task";
import clsx from "clsx";

interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { firstDayOfWeek } = useCalendar();
  const { moveTask, findTask } = useData();
  const { open: openTaskModal } = useTaskModal();
  const [activeTask, setActiveTask] = useState<{ task: Task | null, dayNumber: DayOfWeek | null }>({
    task: null,
    dayNumber: null
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.data.current?.id ?? null;
    const dayNumber = active.data.current?.dayNumber ?? null;

    if (taskId) {
      const task = findTask(taskId);
      if (task) {
        setActiveTask({ task, dayNumber });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask({ task: null, dayNumber: null });

    const { active, over } = event;
    if (!over) return;

    const taskId = active.data.current?.id ?? null;
    if (!taskId) return;
    const task = findTask(taskId);
    if (!task) return;
    const delta = Math.abs(event.delta.x) + Math.abs(event.delta.y);
    if (delta < 10) {
      openTaskModal(task);
    } else {
      const toDay = over.data.current?.dayNumber ?? null;
      if (!toDay) return;
      const toOrder =
        over.data.current?.type === "container"
          ? null
          : over.data.current?.currentOrder;
      moveTask(task, toDay, toOrder);
    }

  };
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 h-full flex flex-col overflow-hidden">
        <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4 overflow-hidden">
          {[...Array(7).keys()].map((i) => (
            <div className={clsx(`border rounded-lg overflow-hidden`, [5, 6].includes(i) ? "col-span-1 row-span-1" : "col-span-1 row-span-2")} key={i}>
              <TaskList
                title={firstDayOfWeek.add(i, "day").format("dddd DD")}
                dayOfWeek={`${i + 1}` as DayOfWeek}
              />
            </div>
          ))}
          <div className={`col-span-3 row-span-1 border rounded-lg overflow-hidden`}>
            <TaskList
              title={"This week"}
              dayOfWeek={"0"}
            />
          </div>
          <div className={`col-span-3 row-span-1 border rounded-lg overflow-hidden`}>
            <TaskList
              title={"One day"}
              dayOfWeek={"someday"}
            />
          </div>
        </div>

        <DragOverlay>
          {activeTask.task ? (
            <div className="shadow-lg opacity-90">
              <DraggableTask
                task={activeTask.task}
                dayOfWeek={activeTask.dayNumber as DayOfWeek}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default MainContent;
