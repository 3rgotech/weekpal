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
