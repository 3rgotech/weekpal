import React, { useCallback, useEffect, useState, useRef } from "react";
import TaskList from "./components/TaskList";
import ProjectDrawer from "./components/ProjectDrawer";
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
import { useSettings } from "./contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import useDayJs from "./utils/dayjs";
import { Weekday, dateOfDay } from "./utils/week";
import { dropOrder, reorderedIndex } from "./utils/taskMoves";
import WeekMark from "./components/WeekMark";
import { isWeekDone } from "./utils/weekDone";
import { columnTemplate } from "./utils/week";
import DropZones, { DropAction, DROP_ZONE_PREFIX } from "./components/DropZones";
import { moveTarget } from "./utils/taskMoves";
interface MainContentProps { }

const MainContent: React.FC<MainContentProps> = () => {
  const { t } = useTranslation();
  const {
    settings: { dayHeaderFormat, weekStartsOn },
  } = useSettings();
  const { firstDayOfWeek, layout } = useCalendar();
  const { tasks, allTasks, moveTask, findTask, moveTaskToProject, relocateTask, deleteTask, restoreTask } = useData();
  const { open: openTaskModal } = useTaskModal();
  const dayjs = useDayJs();
  const [activeTask, setActiveTask] = useState<{
    task: Task | null;
    dayOfWeek: DayOfWeek | null;
  }>({
    task: null,
    dayOfWeek: null,
  });

  /*
   * The task a drop zone just deleted, for as long as it can still be taken back.
   *
   * A drop is the fastest delete the board has, and the easiest to land by mistake: a release a
   * few pixels off. Five seconds to undo it is what makes it safe to offer.
   */
  const [deleted, setDeleted] = useState<Task | null>(null);

  useEffect(() => {
    if (!deleted) {
      return;
    }

    const timer = window.setTimeout(() => setDeleted(null), 5000);

    return () => window.clearTimeout(timer);
  }, [deleted]);

  const undoDelete = () => {
    if (deleted) {
      restoreTask(deleted);
      setDeleted(null);
    }
  };

  /*
   * A drop onto one of the zones.
   *
   * `origin` is the task as it was when the drag began, `task` as it is now. They differ when the
   * drag crossed another day on its way up: the board moves a task as it hovers, not as it lands,
   * so by the time it reaches a zone it may already be on Friday. "Same day next week" means the
   * day it was picked up from, and an undone delete puts it back there too.
   */
  const dropOnZone = (action: DropAction, task: Task, origin: Task) => {
    if (action === "delete") {
      deleteTask(task);
      setDeleted(origin);
      return;
    }

    void relocateTask(task, moveTarget(origin, action, dayjs(), weekStartsOn));
  };

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

      // A zone floats over the top bar and may overlap a column beneath it; under the pointer,
      // the zone is what was aimed at. Never remembered as the last target: that is what a drop
      // onto empty space falls back to, and a release in the gap beside Delete must not delete.
      const zone = pointerIntersections.find((collision) => collision.id.toString().startsWith(DROP_ZONE_PREFIX));
      if (zone) {
        return [zone];
      }

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
    const origin = activeTask.task;
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
      const action = over.data.current?.action as DropAction | undefined;
      if (action) {
        dropOnZone(action, task, origin ?? task);
        return;
      }

      // Dropped in the drawer — on a project's list, or on a task already in one. A backlog has
      // no day, so this is settled before the day lookup rather than falling through it and
      // ending the drag in silence, which is what the drawer did before it was a drop target.
      const toProject = over.data.current?.projectId ?? null;
      if (toProject) {
        void moveTaskToProject(task, toProject);
        return;
      }

      const toDay = over.data.current?.dayOfWeek ?? null;
      if (!toDay) return;

      const onContainer = over.data.current?.type === "container";
      // The whole rectangle, not just its top edge: the undated buckets lay their cards out in a
      // grid, where two cards can share a top and only the horizontal axis separates them.
      const activeRect = active.rect.current.translated;
      const from = active.data.current?.sortable;
      const to = over.data.current?.sortable;

      // Dropped on empty space in a column: the end of it. Dropped on a task in the same list —
      // which is every drop by the time it ends, since crossing lists is settled while hovering —
      // exactly where the sortable preview showed it. Otherwise, whichever side of that task's
      // middle the dragged row finished on.
      const toOrder = onContainer || !activeRect
        ? tasks.filter((t) => t.weekCode === task.weekCode && t.dayOfWeek === toDay).length
        : from && to && from.containerId === to.containerId
          ? reorderedIndex(to.items.map(String), from.index, to.index, (id) => (
            findTask(id.replace("task-", ""))?.completed ?? false
          ))
          : dropOrder(activeRect, over.rect, over.data.current?.currentOrder ?? 0);

      moveTask(task, toDay, toOrder);
    }
  };

  const findContainer = (id: string | number) => {
    if (id.toString().includes("droppable")) {
      return id.toString();
    }
    const taskId = id.toString().replace("task-", "");
    const task = findTask(taskId);

    if (!task) {
      return null;
    }

    // A backlog task's container is its project, not the Some day column: both are tasks with
    // no week, and telling them apart is exactly what `projectId` is for.
    return task.taskType === "someday" && task.belongsToProject
      ? `project-${task.projectId}-droppable`
      : `${task.dayOfWeek}-droppable`;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // A zone is not a list: what it does happens on drop.
    if (overId.startsWith(DROP_ZONE_PREFIX)) {
      return;
    }

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

    // Crossing into or out of the drawer is settled on drop, not while hovering: this handler
    // writes the move on every pass, and a task dragged over a project on its way to Friday
    // would be filed there and back again on the way.
    if (activeContainer.startsWith("project-") || overContainer.startsWith("project-")) {
      return;
    }

    // Find the task being dragged
    const taskId = activeId.replace("task-", "");
    const task = findTask(taskId);
    if (!task) return;

    // Get the new day from the container ID
    const newDay = overContainer.replace("-droppable", "") as DayOfWeek;

    // Calculate the new order
    const tasksInTargetDay = tasks.filter((t) => t.dayOfWeek === newDay);
    let newOrder: number;

    if (over.data.current?.type === "task") {
      // If dropping on another task, use its order
      const overTask = findTask(over.id.toString().replace("task-", ""));
      if (!overTask) return;

      const activeRect = active.rect.current.translated;

      newOrder = !activeRect
        ? overTask.order ?? 0
        : dropOrder(activeRect, over.rect, overTask.order ?? 0);
    } else {
      // If dropping in empty space, put at the end
      newOrder = tasksInTargetDay.length;
    }

    // Move the task
    moveTask(task, newDay, newOrder);

    recentlyMovedToNewContainer.current = true;
  };

  const dayColumn = (day: Weekday) => {
    const date = dateOfDay(firstDayOfWeek, day, weekStartsOn);

    return (
      <TaskList
        title={date.format(dayHeaderFormat)}
        dayOfWeek={`${day}` as DayOfWeek}
        isToday={date.isSame(dayjs(), "day")}
      />
    );
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
      {/* The drawer sits inside the DndContext, which is the point of putting projects here at
          all: a backlog task can be dragged straight out of its list and onto a day. */}
      {/* No bar along the bottom here, so the board itself keeps clear of the home indicator —
          and of a notch down the side when a tablet is held in landscape. */}
      <div className="h-full flex flex-row overflow-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="p-3 xl:p-5 flex-1 flex flex-col overflow-hidden">
        <div className="grow flex flex-col gap-3 overflow-hidden">
          {layout.grid ? (
            <>
              {/* The two-row presets (R14): the days and *this week* as one grid, read along the
                  rows or down the columns, and *Some day* the full width underneath — where its
                  tasks wrap into as many columns as the width allows. */}
              <div
                className="relative flex-[2] min-h-0 grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${layout.grid.columnCount}, minmax(0, 1fr))`,
                  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                  gridAutoFlow: layout.grid.flow,
                }}
                data-tour="days"
              >
                <WeekMark done={isWeekDone(allTasks, layout.visible)} shape="frame" />
                {layout.grid.cells.map((cell) => (
                  <div className="min-h-0 overflow-hidden rounded-xl" key={cell}>
                    {cell === "0"
                      ? <TaskList title={t("main.this_week")} dayOfWeek={"0"} />
                      : dayColumn(parseInt(cell, 10) as Weekday)}
                  </div>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden rounded-xl" data-tour="buckets">
                <TaskList title={t("main.some_day")} dayOfWeek={"someday"} />
              </div>
            </>
          ) : (
            <>
          {/* Two rows in a 2:1 split, as a flex column rather than the three-row grid this
              replaces: with the number of day columns now a setting, the buckets underneath
              would otherwise need their spans recomputed from it, and an odd column count has
              no honest halves to span. */}
          <div
            className="relative flex-[2] min-h-0 grid gap-3"
            style={{ gridTemplateColumns: columnTemplate(layout) }}
            data-tour="days"
          >
            {/* R9: off the unfiltered list, like the day strike — a week is not finished because
                the categories on screen are. A rule when the days sit in one row; the frame when
                some are stacked, since a horizontal stroke would have nothing to span. */}
            <WeekMark
              done={isWeekDone(allTasks, layout.visible)}
              shape={layout.columns.every((column) => column.days.length === 1) ? "rule" : "frame"}
            />
            {/* One element per column, whether it holds one day or a run of days that are not
                worked — the weekend's stacked pair generalised. `min-h-0` is what makes a cell
                scroll its own list: without it a grid item takes its content's height as a
                minimum and spills past the row. */}
            {layout.columns.map((column) => (
              <div className="min-h-0 flex flex-col gap-3" key={column.days[0]}>
                {column.days.map((day) => (
                  <div className="flex-1 min-h-0 overflow-hidden rounded-xl" key={day}>
                    {dayColumn(day)}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-2 gap-3" data-tour="buckets">
            <div className="min-h-0 overflow-hidden rounded-xl">
              <TaskList title={t("main.this_week")} dayOfWeek={"0"} />
            </div>
            <div className="min-h-0 overflow-hidden rounded-xl">
              <TaskList title={t("main.some_day")} dayOfWeek={"someday"} />
            </div>
          </div>
            </>
          )}
        </div>

        <DropZones task={activeTask.task} />

        {deleted && (
          <div
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex justify-center px-4"
            role="status"
          >
            <div className="flex max-w-full items-center gap-3 rounded-xl bg-wp-fg py-2 pr-2 pl-4 text-sm text-wp-bg shadow-wp-pop">
              <span className="truncate">{t("task.drop.deleted", { title: deleted.title })}</span>
              <button
                type="button"
                onClick={undoDelete}
                className="shrink-0 rounded-lg px-3 py-1 font-semibold underline cursor-pointer hover:bg-wp-bg/15 focus-visible:outline-2 focus-visible:outline-wp-accent"
              >
                {t("task.drop.undo")}
              </button>
            </div>
          </div>
        )}

        <DragOverlay>
          {activeTask.task ? (
            <div className="rounded-lg shadow-wp-pop">
              <DraggableTask
                task={activeTask.task}
              // dayOfWeek={activeTask.dayOfWeek as DayOfWeek}
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>

        <ProjectDrawer />
      </div>
    </DndContext>
  );
};

export default MainContent;
