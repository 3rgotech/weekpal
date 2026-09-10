import React, { useLayoutEffect, useRef } from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import VirtualTaskList from "./VirtualTaskList";
import NewTask from "./NewTask";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";
import EventList from "./EventList";
import { useSettings } from "../contexts/SettingsContext";
import { useAccount } from "../contexts/AccountContext";
import { Gauge, VIRTUALISE_ABOVE, columnLimit } from "../utils/capacity";
import { matchesCategorySelection } from "../utils/categories";
import { isPastDay, recoverableTasks } from "../utils/recovery";
import { dayHours } from "../utils/hours";
import { useHiddenBelow } from "../utils/useHiddenBelow";
import HiddenBelow from "./HiddenBelow";
import { nextAfter, unestimatedIn } from "../utils/batchEstimate";
import BatchEstimateRow from "./BatchEstimateRow";
import Task from "../data/task";
import { useShortcuts } from "../contexts/ShortcutsContext";
import { playFlip, readPositions } from "../utils/flip";
import { isDayDone } from "../utils/dayDone";
import { useContentHeight } from "../utils/useContentHeight";
import DayStrike from "./DayStrike";
import useDayJs from "../utils/dayjs";

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
  const { currentWeek, firstDayOfWeek, dateOf } = useCalendar();
  const { settings } = useSettings();
  const { subscribed } = useAccount();
  const {
    tasks, allTasks, events, categories,
    estimatingDay, startEstimating, stopEstimating, estimateTask, dayShare,
  } = useData();
  const { activeTaskId, setActiveTaskId } = useShortcuts();
  const dayjs = useDayJs(settings.language);

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

  // Long columns render only what is near the viewport. Short ones — every column on an ordinary
  // board — are left exactly as they were, since windowing is not free while a drag is running.
  const virtualise = filteredTasks.length > VIRTUALISE_ABOVE;
  const scrollRef = useRef<HTMLUListElement>(null);

  /*
   * The travelling half of the completion ceremony.
   *
   * Only worth doing when a tick actually moves something — with the re-sort setting off, which
   * is the default, nothing changes place and there is nothing to animate. Skipped entirely for
   * a windowed column too: rows there mount and unmount as the viewport moves, so "it was here a
   * moment ago" is not a fact the DOM can be asked about.
   */
  const travels = settings.completionResort && !virtualise;

  // Measured from the DOM rather than counted from the list: what is out of sight depends on how
  // tall the rows turned out and where the user has scrolled to, and neither is in the data.
  const hiddenBelow = useHiddenBelow(scrollRef, filteredTasks.length);
  const positionsBefore = useRef(readPositions(null));

  useLayoutEffect(() => {
    if (travels) {
      playFlip(scrollRef.current, positionsBefore.current);
    }

    positionsBefore.current = travels ? readPositions(scrollRef.current) : readPositions(null);
  });

  // The whole column either way: `SortableContext` needs the full ordering to place a drop, and
  // a row that is not mounted simply has no rectangle to collide with.
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

  /*
   * What this day is still holding, if it has already been.
   *
   * Off the unfiltered list for the same reason the capacity count is: narrowing the board to
   * one category must not change how much a past day says it left behind.
   */
  const unfinished = isPastDay(dateOf(dayOfWeek), dayjs())
    ? recoverableTasks(allTasks, dayOfWeek).length
    : 0;

  /*
   * A finished day, and where its ink should stop.
   *
   * Off the unfiltered list: a day is not finished because the categories you happen to be
   * looking at are. Undated buckets are excluded — "Some day is done" is not a thing that can be
   * true, and the mark is about a day having been got through.
   */
  const dayIsDone = isDay && isDayDone(allTasks, dayOfWeek);
  const hostRef = useRef<HTMLDivElement>(null);
  const strikeHeight = useContentHeight(hostRef, scrollRef, dayIsDone);

  /*
   * The day in hours rather than in tasks, when it can honestly be measured.
   *
   * Weekdays only: the undated buckets have no calendar day to subtract meetings from, and "how
   * much of Some day is free" is not a question with an answer.
   */
  const hours = isDay
    ? dayHours(counted, filteredEvents, settings.workingDayHours)
    : null;

  /*
   * Batch estimation, for this column.
   *
   * The selection is the board's own — `j`/`k` still browse while the mode is on, because
   * skipping something you do not want to size is just moving. That is what keeps this from
   * being a new keyboard grammar.
   */
  const estimating = estimatingDay === dayOfWeek;
  const pending = estimating ? unestimatedIn(allTasks, dayOfWeek) : [];

  const answerEstimate = (task: Task, minutes: number) => {
    const index = pending.findIndex((candidate) => candidate.id === task.id);

    estimateTask(task, minutes);

    // The answered task drops out of `pending` on the next render, so the task that takes its
    // index is the next one to ask about.
    const next = nextAfter(pending.filter((candidate) => candidate.id !== task.id), index);

    if (next === null) {
      // The column is done. Leaving on its own is what tells the user so — a mode that stayed
      // open over a finished column would be waiting for an answer that cannot be given.
      stopEstimating();

      return;
    }

    setActiveTaskId(next);
  };

  const skipEstimate = (task: Task) => {
    const index = pending.findIndex((candidate) => candidate.id === task.id);
    // Skipped tasks stay in the list — a skip is "not now", not "never", and the task is
    // still unestimated. Moving past it is all that happens.
    const next = nextAfter(pending, index + 1);

    if (next === null || next === task.id) {
      stopEstimating();

      return;
    }

    setActiveTaskId(next);
  };

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
    <div
      ref={(node) => {
        setNodeRef(node);
        hostRef.current = node;
      }}
      // `relative` so the stroke can be laid over the column, and `day-strike__host` so hovering
      // anywhere in the day fades the ink rather than only hovering the line itself — which is
      // two pixels wide and diagonal.
      className="h-full flex flex-col relative day-strike__host"
    >
      <DayStrike done={dayIsDone} height={strikeHeight} />
      <TaskListHeader
        title={title}
        dayOfWeek={dayOfWeek}
        weekCode={currentWeek}
        isToday={isToday}
        gauges={gauges}
        unfinished={unfinished}
        // The day's outstanding work, off the unfiltered list: what a day is carrying does not
        // change because the board is narrowed to one category. Completed tasks are excluded —
        // the number is about what is still ahead, not what the day originally weighed.
        estimateOf={counted}
        hours={hours}
        onEstimate={isDay ? () => {
          const first = unestimatedIn(allTasks, dayOfWeek)[0];

          // Nothing to ask about is not a mode worth entering.
          if (!first) {
            return;
          }

          setActiveTaskId(first.id);
          startEstimating(dayOfWeek);
        } : undefined}
        estimating={estimating}
        share={dayShare?.get(dayOfWeek) ?? null}
      />
      {/* `showEvents` had been declared in the settings type and read by nothing since the
          board was written, so the switch existed and did not work. */}
      {settings.showEvents && filteredEvents.length > 0 && <EventList events={filteredEvents} />}
      {/* `relative`, so the clipped-edge marker has the scrolling list to anchor to rather than
          the whole column — the fold is at the bottom of the list, not at the bottom of the day. */}
      <div className="flex-1 min-h-0 relative">
      <ul ref={scrollRef} className={clsx("h-full overflow-y-auto py-1", !virtualise && "space-y-2")}>
        <SortableContext items={taskIds}>
          {virtualise
            ? (
              <VirtualTaskList
                tasks={filteredTasks}
                scrollRef={scrollRef}
                renderTask={(task) => <DraggableTask task={task} dayOfWeek={dayOfWeek} />}
              />
            )
            : filteredTasks.map((task) => (
              <React.Fragment key={task.id}>
                {/* Estimated cards dim and the rest stay lit, so the column shows what is left
                    to answer without losing its shape — the day still reads as the day. */}
                <div className={clsx(estimating && task.estimatedMinutes !== null && "opacity-40")}>
                  <DraggableTask task={task} dayOfWeek={dayOfWeek} />
                </div>

                {estimating && activeTaskId === task.id && (
                  <BatchEstimateRow
                    task={task}
                    remaining={pending.length}
                    onChoose={(minutes) => answerEstimate(task, minutes)}
                    onSkip={() => skipEstimate(task)}
                    onLeave={stopEstimating}
                  />
                )}
              </React.Fragment>
            ))}
        </SortableContext>

        {!isOver && <NewTask dayOfWeek={dayOfWeek} />}
      </ul>

      {/* *(rt §4)* No hard cap — the answer to a long column is to say how long it is, never to
          refuse the ninth task. Not on a windowed column: there the rows below the fold are not
          mounted, so "how many are hidden" is a question the DOM cannot answer. */}
      {!virtualise && (
        <HiddenBelow
          count={hiddenBelow}
          onReveal={() => scrollRef.current?.scrollBy({ top: scrollRef.current.clientHeight * 0.8, behavior: "smooth" })}
        />
      )}
      </div>
    </div>
  );
};

export default TaskList;
