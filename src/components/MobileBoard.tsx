import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import DayNav from "./DayNav";
import EventList from "./EventList";
import MobileTask from "./MobileTask";
import NewTask from "./NewTask";
import CapacityCount from "./CapacityCount";
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
  const dayjs = useDayJs(settings.language);
  const { tasks, allTasks, events } = useData();
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

  const date = dateOf(visibleDay);

  const isToday = date?.isSame(dayjs(), "day") ?? false;

  // The same rule the wide board follows: days against `dayCapacity`, Some day against its own
  // number, and the "this week" bucket uncounted.
  const isSomeday = visibleDay === "someday";
  const limit = isSomeday ? settings.somedayLimit : settings.dayCapacity;
  const counted = date || isSomeday
    ? allTasks.filter((task) => (
      task.dayOfWeek === visibleDay && !task.completed && !task.belongsToProject
    )).length
    : undefined;

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
        <span className="ml-auto">
          <CapacityCount planned={counted} limit={limit} />
        </span>
      </header>

      {dayEvents.length > 0 && (
        <div className="flex-none px-2">
          <EventList events={dayEvents} />
        </div>
      )}

      <ul className="flex-1 overflow-y-auto px-1">
        {dayTasks.map((task) => (
          <MobileTask key={task.id} task={task} />
        ))}
        <NewTask dayOfWeek={visibleDay} />
      </ul>

      <DayNav visibleDay={visibleDay} onSelect={setVisibleDay} />
    </div>
  );
};

export default MobileBoard;
