import React, { useContext } from "react";
import Days from "./components/Days";
import TaskList from "./components/TaskList";
import { DataContext } from "./contexts/DataContext";
import { WeekTaskList } from "./types";
import { DndContext, closestCenter } from "@dnd-kit/core";

interface MainContentProps {}

const MainContent: React.FC<MainContentProps> = () => {
  const { firstDayOfWeek, currentWeekNumber, moveTask } = useContext(DataContext);

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    console.log(event);

    const fromDay = active.data.current.dayNumber;
    const toDay = over.data.current.dayNumber;
    const toOrder =
      over.data.current.type === "container"
        ? null
        : over.data.current.currentOrder;
    const taskId = active.data.current.id;
    moveTask(fromDay, toDay, toOrder, taskId);
  };
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
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
              <div className={`${gridCls} border rounded-lg p-4`} key={i}>
                <Days
                  title={title}
                  dayNumber={`${i + 1}` as keyof WeekTaskList}
                  weekNumber={currentWeekNumber}
                />
                <TaskList
                  weekNumber={currentWeekNumber}
                  dayNumber={`${i + 1}` as keyof WeekTaskList}
                />
              </div>
            );
          })}
          <div className={`col-span-3 row-span-1 border rounded-lg p-4`}>
            <Days
              title={"This week"}
              dayNumber={"0"}
              weekNumber={currentWeekNumber}
            />
            <TaskList weekNumber={currentWeekNumber} dayNumber={"0"} />
          </div>
          <div className={`col-span-3 row-span-1 border rounded-lg p-4`}>
            <Days
              title={"One day"}
              dayNumber={"someday"}
              weekNumber={currentWeekNumber}
            />
            <TaskList weekNumber={currentWeekNumber} dayNumber={"someday"} />
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default MainContent;
