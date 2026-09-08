import React, { createContext, useState, ReactNode, useContext, useEffect, useMemo } from "react";
import useDayJs from "../utils/dayjs";
import { useSettings } from "./SettingsContext";
import { Dayjs } from "dayjs";
import { DayOfWeek } from "../types";
import {
  Weekday,
  WeekLayout,
  dateOfDay,
  weekAnchor,
  weekCodeOf,
  weekLayout,
  weekStart,
} from "../utils/week";
import { startDayWatch, subscribeToDayChange } from "../utils/dayWatch";

interface CalendarContextProps {
  currentDate: Dayjs;
  currentWeek: string;
  /** The code of the week today falls in, whichever week is being looked at. */
  thisWeek: string;
  currentWeekNumber: number;
  /** The date in the board's first day column — not necessarily a Monday. */
  firstDayOfWeek: Dayjs;
  /** The date a day column carries in the week being looked at. */
  dateOf: (day: DayOfWeek) => Dayjs | null;
  /** Which day columns the board is drawing, and in what order. */
  layout: WeekLayout;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
}

const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  const [currentDate, setCurrentDate] = useState(dayjs());

  /*
   * Bumped when the calendar day changes underneath an idle tab.
   *
   * `thisWeek` below is computed during render, so without something to force a render it keeps
   * whatever answer it gave when the tab was opened — and a board left open from Thursday to
   * Sunday goes on presenting last week as this week. The value itself is never read; it exists
   * to make React recompute.
   */
  const [, setDayTick] = useState(0);

  const { workingDays, showNonWorkingDays, weekStartsOn } = settings;

  // The week is still an ISO week, whatever day it is drawn from: the anchor is the Monday inside
  // it, so the code the API is asked for never depends on this setting.
  const anchor = weekAnchor(currentDate, weekStartsOn);
  const currentWeekNumber = anchor.isoWeek();
  const currentWeek = weekCodeOf(currentDate, weekStartsOn);
  const thisWeek = weekCodeOf(dayjs(), weekStartsOn);
  const firstDayOfWeek = weekStart(currentDate, weekStartsOn);

  const layout = useMemo(
    () => weekLayout(workingDays, showNonWorkingDays, weekStartsOn),
    [workingDays, showNonWorkingDays, weekStartsOn],
  );

  /** Null for the two undated buckets, which are the whole point of their being undated. */
  const dateOf = (day: DayOfWeek): Dayjs | null => {
    if (day === "0" || day === "someday") {
      return null;
    }

    return dateOfDay(firstDayOfWeek, parseInt(day, 10) as Weekday, weekStartsOn);
  };

  const goToPreviousWeek = () => {
    setCurrentDate((cd) => cd.subtract(1, "week"));
  };
  const goToNextWeek = () => {
    setCurrentDate((cd) => cd.add(1, "week"));
  };
  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  useEffect(() => {
    setCurrentDate(cd => cd.locale(settings.language));
  }, [settings.language]);

  useEffect(() => {
    startDayWatch();

    return subscribeToDayChange(() => {
      setDayTick((tick) => tick + 1);

      /*
       * Follow the rollover, but only for someone who was looking at the present.
       *
       * A user who deliberately navigated to another week is *reading* it, and yanking them to
       * today because midnight passed would be the board taking the page away mid-sentence. But
       * a board sitting on the current week and left overnight should still be on the current
       * week in the morning — that is the whole promise of furniture.
       */
      setCurrentDate((cd) =>
        weekCodeOf(cd, weekStartsOn) === weekCodeOf(dayjs(), weekStartsOn) ? cd : dayjs()
      );
    });
    // `weekStartsOn` is read inside the callback; re-subscribing when it changes keeps the
    // comparison honest for someone who switches their week start while the tab is open.
  }, [weekStartsOn, dayjs]);

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        currentWeek,
        thisWeek,
        currentWeekNumber,
        firstDayOfWeek,
        dateOf,
        layout,
        goToPreviousWeek,
        goToNextWeek,
        goToToday,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};

export { CalendarContext, CalendarProvider, useCalendar };
