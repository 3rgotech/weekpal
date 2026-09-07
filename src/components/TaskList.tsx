import React from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import NewTask from "./NewTask";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";
import EventList from "./EventList";
import { useSettings } from "../contexts/SettingsContext";
import { useAccount } from "../contexts/AccountContext";
import { Gauge, columnLimit } from "../utils/capacity";
import { matchesCategorySelection } from "../utils/categories";

interface TaskProps {
  title: string;
  dayOfWeek: DayOfWeek;
  isToday?: boolean;
}

const TaskList: React.FC<TaskProps> = ({
  title,
  dayOfWeek,
  isToday = false,
}) => {
  const { currentWeek, firstDayOfWeek } = useCalendar();
  const { settings } = useSettings();
  const { subscribed } = useAccount();
  const { tasks, allTasks, events, categories } = useData();

  const { setNodeRef, isOver } = useDroppable({
    id: `${dayOfWeek}-droppable`,
    data: {
      dayOfWeek,
      type: "container",
    },
  });

  const filteredTasks = tasks.filter(
    (task) =>
      task.dayOfWeek === dayOfWeek &&
      (settings.showCompletedTasks || !task.completed)
  );

  const taskIds = filteredTasks
    .map((task) => task.id)
    .filter((id) => id !== null && id !== undefined)
    .map((id) => `task-${id}`);

  const filteredEvents = events.filter(
    (event) => event.dayOfWeek === dayOfWeek
  );

  // Counted off what is still to do, and off the whole list rather than what is on screen: neither
  // hiding completed tasks nor filtering to one category may change how full a column says it is.
  // A day you have finished should stop warning; a day you have narrowed should not look emptier
  // than it is.
  //
  // Some day is counted too, against its own number. `belongsToProject` is excluded because a
  // project's backlog is not the shortlist the limit is about — those tasks live in the drawer
  // and have somewhere to be. The "this week" bucket is deliberately uncounted: it is the
  // overflow the other columns drain into, and a limit there would have nowhere to point.
  const isDay = dayOfWeek !== "0" && dayOfWeek !== "someday";
  const counted = allTasks.filter((task) => (
    task.dayOfWeek === dayOfWeek && !task.completed && !task.belongsToProject
  ));

  const gauges: Gauge[] = [{
    key: "column",
    label: null,
    // Only a weekday counts a chosen set of categories — that setting is about a day's work.
    // The two undated buckets count everything in them, because what they are for is the whole
    // of what is waiting.
    planned: isDay
      ? counted.filter(
        (task) => matchesCategorySelection(task.categoryId, settings.dayCapacityCategories),
      ).length
      : counted.length,
    limit: columnLimit(dayOfWeek, settings),
  }];

  // A category's own limit is a paid feature, so a lapsed account stops being measured against
  // one without losing it: the numbers stay on the categories, and start applying again the
  // moment the plan does.
  if (isDay && subscribed) {
    for (const category of categories) {
      if (category.dayLimit === null) {
        continue;
      }

      const inCategory = counted.filter((task) => task.categoryId === category.id).length;

      // A category with a limit but nothing on this day says nothing useful, and every one of
      // them in the tooltip would bury the day's actual problem.
      if (inCategory > 0) {
        gauges.push({
          key: category.id,
          label: category.name,
          planned: inCategory,
          limit: category.dayLimit,
        });
      }
    }
  }

  return (
    <div ref={setNodeRef} className={`h-full flex flex-col`}>
      <TaskListHeader
        title={title}
        dayOfWeek={dayOfWeek}
        weekCode={currentWeek}
        isToday={isToday}
        gauges={gauges}
      />
      {filteredEvents.length > 0 && <EventList events={filteredEvents} />}
      <ul className={clsx("flex-1 overflow-y-auto py-1 space-y-2")}>
        <SortableContext items={taskIds}>
          {filteredTasks.map((task) => (
            <DraggableTask key={task.id} task={task} dayOfWeek={dayOfWeek} />
          ))}
        </SortableContext>
        {!isOver && <NewTask dayOfWeek={dayOfWeek} />}
      </ul>
    </div>
  );
};

export default TaskList;
