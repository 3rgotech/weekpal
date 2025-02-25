import React, { useState } from "react";
import TaskList from "./components/TaskList";
import { useData } from "./contexts/DataContext";
import { WeekTaskList } from "./types";
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { useTaskModal } from "./contexts/TaskModalContext";
import { useCalendar } from "./contexts/CalendarContext";
import DraggableTask from "./components/DraggableTask";
import Task from "./data/task";

interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { firstDayOfWeek } = useCalendar();
  const { moveTask, findTask } = useData();
  const { open: openTaskModal } = useTaskModal();
  const [activeTask, setActiveTask] = useState<{ task: Task | null, dayNumber: keyof WeekTaskList | null }>({
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
      <div className="p-4 h-full flex flex-col">
        <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4">
          {[...Array(7).keys()].map((i) => {
            const day = firstDayOfWeek.add(i, "day");
            let title = day.format("dddd DD");
            let gridCls = "col-span-1 row-span-2";

            if (i === 5 || i === 6) {
              gridCls = "col-span-1 row-span-1";
            }

            return (
              <div className={`${gridCls} border rounded-lg`} key={i}>
                <TaskList
                  title={title}
                  dayNumber={`${i + 1}` as keyof WeekTaskList}
                />
              </div>
            );
          })}
          <div className={`col-span-3 row-span-1 border rounded-lg`}>
            <TaskList
              title={"This week"}
              dayNumber={"0"}
            />
          </div>
          <div className={`col-span-3 row-span-1 border rounded-lg`}>
            <TaskList
              title={"One day"}
              dayNumber={"someday"}
            />
          </div>
        </div>

        <DragOverlay>
          {activeTask.task ? (
            <div className="shadow-lg opacity-90">
              <DraggableTask
                task={activeTask.task}
                dayNumber={activeTask.dayNumber as keyof WeekTaskList}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default MainContent;
