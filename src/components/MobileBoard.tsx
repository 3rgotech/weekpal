import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import { useAccount } from "../contexts/AccountContext";
import { Gauge, VIRTUALISE_ABOVE, columnLimit } from "../utils/capacity";
import { matchesCategorySelection } from "../utils/categories";
import useDayJs from "../utils/dayjs";
import DayNav from "./DayNav";
import EventList from "./EventList";
import MobileTask from "./MobileTask";
import NewTask from "./NewTask";
import VirtualTaskList from "./VirtualTaskList";
import CapacityCount from "./CapacityCount";
import BatchEstimateStack from "./BatchEstimateStack";
import { unestimatedIn } from "../utils/batchEstimate";
import { boardDayOrder } from "../utils/week";

/**
 * The board on a phone or an upright tablet: one bucket at a time.
 *
 * Seven columns do not survive being made narrow — they become seven headers and no room for what
 * is under them — so the week is navigated rather than displayed, through the pills at the bottom.
 * It opens on today, which is the day someone reaching for this on a phone almost always wants.
 *
 * No drag-and-drop context here at all: the wide board's `DndContext` is the whole mechanism for
 * moving a task there, and on a touch screen dragging between days you cannot see is not a
 * gesture. The task menu does that job instead.
 */
const MobileBoard: React.FC = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { subscribed } = useAccount();
  const dayjs = useDayJs(settings.language);
  const {
    tasks, allTasks, events, categories,
    estimatingDay, startEstimating, stopEstimating, estimateTask,
  } = useData();
  const { dateOf, layout } = useCalendar();

  // Opens on today, unless today is a day this user has hidden — then on the first bucket the
  // board still draws, so it never opens on a column its own nav cannot get back to.
  const [visibleDay, setVisibleDay] = useState<DayOfWeek>(() => {
    const today = `${dayjs().isoWeekday()}` as DayOfWeek;

    return boardDayOrder(layout).includes(today) ? today : "0";
  });

  // A day can stop being drawn while it is the one on screen — hiding non-working days from the
  // settings modal does exactly that.
  useEffect(() => {
    if (!boardDayOrder(layout).includes(visibleDay)) {
      setVisibleDay("0");
    }
  }, [layout, visibleDay]);

  const dayTasks = tasks.filter(
    (task) => task.dayOfWeek === visibleDay && (settings.showCompletedTasks || !task.completed),
  );
  const dayEvents = events.filter((event) => event.dayOfWeek === visibleDay);

  // Below `visibleDay`, which these read. Declared above it, they were a temporal dead zone
  // error that only the type-checker saw — jsdom renders the component and throws at runtime.
  const [stackIndex, setStackIndex] = useState(0);
  const estimating = estimatingDay === visibleDay;
  const pending = unestimatedIn(allTasks, visibleDay);

  // Same threshold as the wide board. Nothing is dragged here, so windowing costs nothing at all
  // beyond the absolute positioning itself.
  const virtualise = dayTasks.length > VIRTUALISE_ABOVE;
  const scrollRef = useRef<HTMLUListElement>(null);

  const date = dateOf(visibleDay);

  const isToday = date?.isSame(dayjs(), "day") ?? false;

  // The same rule the wide board follows: each kind of column against its own number, and a paid
  // account measured per category on the weekdays too.
  const counted = allTasks.filter((task) => (
    task.dayOfWeek === visibleDay && !task.completed && !task.belongsToProject
  ));

  const gauges: Gauge[] = [{
    key: "column",
    label: null,
    // Only a weekday counts a chosen set of categories — that setting is about a day's work.
    // The two undated buckets count everything in them.
    planned: date
      ? counted.filter(
        (task) => matchesCategorySelection(task.categoryId, settings.dayCapacityCategories),
      ).length
      : counted.length,
    limit: columnLimit(visibleDay, settings),
  }];

  if (date && subscribed) {
    for (const category of categories) {
      const inCategory = counted.filter((task) => task.categoryId === category.id).length;

      if (category.dayLimit !== null && inCategory > 0) {
        gauges.push({
          key: category.id,
          label: category.name,
          planned: inCategory,
          limit: category.dayLimit,
        });
      }
    }
  }

  // The day header format is one string carrying two lines, split on a pipe — the same contract
  // `TaskListHeader` reads on the wide board.
  const [dayName, dayDate] = date
    ? date.format(settings.dayHeaderFormat).split(" | ")
    : [visibleDay === "0" ? t("main.this_week") : t("main.some_day"), ""];

  return (
    <div className="h-full flex flex-col overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header
        className={clsx(
          "flex-none flex items-baseline gap-2 px-3 py-2 border-b-2",
          isToday ? "border-sky-500 text-sky-500" : "border-slate-200 dark:border-slate-600 dark:text-white",
        )}
      >
        <h2 className="text-lg font-semibold">{dayName}</h2>
        {dayDate && <span className="text-sm uppercase opacity-80">{dayDate}</span>}
        <span className="ml-auto flex items-center gap-2">
          {/* Same trigger as the wide board, in the same place: the number the run is about to
              change. Absent once the day is fully estimated, so there is no button that does
              nothing. */}
          {pending.length > 0 && !estimating && (
            <button
              type="button"
              onClick={() => {
                setStackIndex(0);
                startEstimating(visibleDay);
              }}
              className="text-xs underline text-slate-500 dark:text-slate-400"
            >
              {t("estimate.batch")}
            </button>
          )}
          <CapacityCount gauges={gauges} />
        </span>
      </header>

      {/* The stack replaces the list while a run is on: on a phone the column *is* the screen,
          so there is nothing to dim around the card being asked about. */}
      {estimating ? (
        <BatchEstimateStack
          tasks={pending}
          index={Math.min(stackIndex, Math.max(0, pending.length - 1))}
          onChoose={(task, minutes) => {
            estimateTask(task, minutes);

            // The answered task leaves `pending`, so the same index is already the next card.
            // Only when it was the last one is there nowhere left to go.
            if (pending.length <= 1) {
              stopEstimating();
            }
          }}
          onSkip={() => {
            const next = stackIndex + 1;

            // A skipped task stays in the list — "not now" rather than "never" — so the run ends
            // when the cursor runs off the end rather than when the list empties.
            if (next >= pending.length) {
              stopEstimating();

              return;
            }

            setStackIndex(next);
          }}
          onLeave={stopEstimating}
        />
      ) : (
      <>
      {dayEvents.length > 0 && (
        <div className="flex-none px-2">
          <EventList events={dayEvents} />
        </div>
      )}

      <ul ref={scrollRef} className="flex-1 overflow-y-auto px-1">
        {virtualise
          ? (
            <VirtualTaskList
              tasks={dayTasks}
              scrollRef={scrollRef}
              renderTask={(task) => <MobileTask task={task} />}
              estimate={64}
            />
          )
          : dayTasks.map((task) => (
            <MobileTask key={task.id} task={task} />
          ))}

        <NewTask dayOfWeek={visibleDay} />
      </ul>
      </>
      )}

      <DayNav visibleDay={visibleDay} onSelect={setVisibleDay} />
    </div>
  );
};

export default MobileBoard;
