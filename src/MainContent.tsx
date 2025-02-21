import React, { useContext, useState } from "react";
import TaskList from "./components/TaskList";
import { DataContext } from "./contexts/DataContext";
import { Task, WeekTaskList } from "./types";
import { DndContext, closestCenter, DragOverlay } from "@dnd-kit/core";
import { TaskModalContext } from "./contexts/TaskModalContext";
import DraggableTask from "./components/DraggableTask";

interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { firstDayOfWeek, currentWeekNumber, moveTask, findTask } = useContext(DataContext);
  const { open: openTaskModal } = useContext(TaskModalContext);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.data.current.id;
    const delta = Math.abs(event.delta.x) + Math.abs(event.delta.y);
    if (delta < 10) {
      openTaskModal(findTask(taskId));
    } else {
      const fromDay = active.data.current.dayNumber;
      const toDay = over.data.current.dayNumber;
      const toOrder =
        over.data.current.type === "container"
          ? null
          : over.data.current.currentOrder;
      moveTask(fromDay, toDay, toOrder, taskId);
    }

  };
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
      </div>
    </DndContext>
  );
};

export default MainContent;
