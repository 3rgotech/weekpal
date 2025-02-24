import React from "react";
import TaskList from "./components/TaskList";
import { useData } from "./contexts/DataContext";
import { WeekTaskList } from "./types";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { useTaskModal } from "./contexts/TaskModalContext";
import { useCalendar } from "./contexts/CalendarContext";

interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { firstDayOfWeek } = useCalendar();
  const { moveTask, findTask } = useData();
  const { open: openTaskModal } = useTaskModal();

  const handleDragEnd = (event: DragEndEvent) => {
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
