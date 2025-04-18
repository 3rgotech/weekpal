import React, { useCallback, useState, useRef } from "react";
import TaskList from "./components/TaskList";
import { useData } from "./contexts/DataContext";
import { DayOfWeek } from "./types";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  CollisionDetection,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  DragOverEvent,
} from "@dnd-kit/core";
import { useTaskModal } from "./contexts/TaskModalContext";
import { useCalendar } from "./contexts/CalendarContext";
import DraggableTask from "./components/DraggableTask";
import Task from "./data/task";
import clsx from "clsx";
import { useSettings } from "./contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import useDayJs from "./utils/dayjs";
interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { t } = useTranslation();
  const {
    settings: { dayHeaderFormat },
  } = useSettings();
  const { firstDayOfWeek } = useCalendar();
  const { tasks, moveTask, findTask } = useData();
  const { open: openTaskModal } = useTaskModal();
  const dayjs = useDayJs();
  const [activeTask, setActiveTask] = useState<{
    task: Task | null;
    dayOfWeek: DayOfWeek | null;
  }>({
    task: null,
    dayOfWeek: null,
  });

  // Add these refs
  const lastOverId = useRef<string | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  // Create a map of container items
  const getContainerItems = useCallback(() => {
    const items: { [key: string]: string[] } = {};
    ["1", "2", "3", "4", "5", "6", "7", "0", "someday"].forEach((dayOfWeek) => {
      items[`${dayOfWeek}-droppable`] = tasks
        .filter((task) => task.dayOfWeek === dayOfWeek)
        .map((task) => `task-${task.id}`);
    });
    return items;
  }, [tasks]);

  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      const items = getContainerItems();

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : rectIntersection(args);

      let overId = intersections.length > 0 ? intersections[0].id : null;

      if (overId != null) {
        const containerItems = items[overId];

        // Check if we're hovering over a container
        if (overId.toString().includes("droppable")) {
          lastOverId.current = overId.toString();
          return [{ id: overId }];
        }

        // If we're over items in a container, find the closest one
        if (containerItems?.length > 0) {
          const closestItems = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (container) =>
                container.id !== overId &&
                containerItems.includes(container.id.toString())
            ),
          });

          if (closestItems.length > 0) {
            overId = closestItems[0].id;
          }
        }

        lastOverId.current = overId.toString();
        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = args.active.id.toString();
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.data.current?.id ?? null;
    const dayOfWeek = active.data.current?.dayOfWeek ?? null;

    if (taskId) {
      const task = findTask(taskId);
      if (task) {
        setActiveTask({ task, dayOfWeek });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask({ task: null, dayOfWeek: null });

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
      const toDay = over.data.current?.dayOfWeek ?? null;
      if (!toDay) return;
      let toOrder =
        over.data.current?.type === "container"
          ? null
          : over.data.current?.currentOrder;
      if (toOrder === null) {
        toOrder = tasks.filter(
          (t) => t.weekCode === task.weekCode && t.dayOfWeek === toDay
        ).length;
      }
      moveTask(task, toDay, toOrder);
    }
  };

  const findContainer = (id: string | number) => {
    if (id.toString().includes("droppable")) {
      return id.toString();
    }
    const taskId = id.toString().replace("task-", "");
    const task = findTask(parseInt(taskId, 10));
    return task ? `${task.dayOfWeek}-droppable` : null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    // Find the task being dragged
    const taskId = activeId.replace("task-", "");
    const task = findTask(parseInt(taskId, 10));
    if (!task) return;

    // Get the new day from the container ID
    const newDay = overContainer.replace("-droppable", "") as DayOfWeek;

    // Calculate the new order
    const tasksInTargetDay = tasks.filter((t) => t.dayOfWeek === newDay);
    let newOrder: number;

    if (over.data.current?.type === "task") {
      // If dropping on another task, use its order
      const overTask = findTask(
        parseInt(over.id.toString().replace("task-", ""), 10)
      );
      if (!overTask) return;

      const isBelowOverItem =
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;

      newOrder = isBelowOverItem
        ? (overTask.order ?? 0) + 1
        : overTask.order ?? 0;
    } else {
      // If dropping in empty space, put at the end
      newOrder = tasksInTargetDay.length;
    }

    // Move the task
    moveTask(task, newDay, newOrder);

    recentlyMovedToNewContainer.current = true;
  };

  return (
    <DndContext
      collisionDetection={collisionDetectionStrategy}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="p-4 h-full flex flex-col overflow-hidden">
        <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4 overflow-hidden">
          {[...Array(7).keys()].map((i) => (
            <div
              className={clsx(
                `overflow-hidden rounded-lg`,
                [5, 6].includes(i)
                  ? "col-span-1 row-span-1"
                  : "col-span-1 row-span-2"
              )}
              key={i}
            >
              <TaskList
                title={firstDayOfWeek.add(i, "day").format(dayHeaderFormat)}
                dayOfWeek={`${i + 1}` as DayOfWeek}
                isToday={firstDayOfWeek.add(i, "day").isSame(dayjs(), "day")}
              />
            </div>
          ))}
          <div
            className={`col-span-3 row-span-1 overflow-hidden rounded-lg`}
          >
            <TaskList title={t("main.this_week")} dayOfWeek={"0"} />
          </div>
          <div
            className={`col-span-3 row-span-1 overflow-hidden rounded-lg`}
          >
            <TaskList title={t("main.some_day")} dayOfWeek={"someday"} />
          </div>
        </div>

        <DragOverlay>
          {activeTask.task ? (
            <div className="shadow-lg opacity-90">
              <DraggableTask
                task={activeTask.task}
              // dayOfWeek={activeTask.dayOfWeek as DayOfWeek}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default MainContent;
