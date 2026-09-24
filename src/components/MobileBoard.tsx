import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Clock3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import { useAccount } from "../contexts/AccountContext";
import { Gauge, VIRTUALISE_ABOVE, columnLimit, worstGauge } from "../utils/capacity";
import { matchesCategorySelection } from "../utils/categories";
import useDayJs from "../utils/dayjs";
import DayNav from "./DayNav";
import EventList from "./EventList";
import MobileTask from "./MobileTask";
import NewTask from "./NewTask";
import VirtualTaskList from "./VirtualTaskList";
import CapacityBar from "./CapacityBar";
import BatchEstimateStack from "./BatchEstimateStack";
import DayShareBar from "./DayShareBar";
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
    estimatingDay, startEstimating, stopEstimating, estimateTask, dayShare,
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
      <header data-tour="day" className="flex-none flex flex-col gap-3 px-4 pt-[18px] pb-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2
                className={clsx(
                  "truncate text-[22px] font-bold tracking-[-0.3px] leading-tight",
                  isToday ? "text-wp-accent" : "text-wp-fg",
                )}
              >
                {dayName}
              </h2>
              {isToday && (
                <span className="shrink-0 rounded-full bg-wp-accent px-2 py-0.5 text-[11px] font-bold leading-4 text-wp-on-accent">
                  {t("main.today")}
                </span>
              )}
            </div>
            {/* The undated buckets have no date to show, so the line says what they are for. */}
            <span className="truncate text-[13px] font-medium text-wp-muted">
              {dayDate || (visibleDay === "0" ? t("main.this_week_hint") : visibleDay === "someday" ? t("main.some_day_hint") : "")}
            </span>
          </div>

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
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-wp-track px-2.5 py-[7px] text-xs font-semibold text-wp-fg-secondary cursor-pointer hover:text-wp-fg"
            >
              <Clock3 size={14} aria-hidden="true" />
              {t("estimate.batch_short")}
            </button>
          )}
        </div>

        {/* The slots once a limit is set; otherwise the same rail as the wide board. A one-day
            board cannot show the week, so this is the only place it can say "and this is the
            heavy one" — the question the glance asks and the day's own count cannot answer. */}
        {worstGauge(gauges)
          ? <CapacityBar gauges={gauges} isToday={isToday} className="pr-0" />
          : <DayShareBar share={dayShare?.get(visibleDay) ?? null} level="ok" />}
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
      {settings.showEvents && dayEvents.length > 0 && (
        <div className="flex-none px-1 pt-0.5">
          <EventList events={dayEvents} />
        </div>
      )}

      <ul
        ref={scrollRef}
        className={clsx(
          "flex-1 overflow-y-auto px-4 pt-0.5 pb-4",
          // Positioned rows when windowed, so the gap is the window's to keep, not the list's.
          !virtualise && "flex flex-col gap-2",
        )}
      >
        {virtualise
          ? (
            <VirtualTaskList
              tasks={dayTasks}
              scrollRef={scrollRef}
              renderTask={(task) => <MobileTask task={task} />}
              estimate={72}
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
