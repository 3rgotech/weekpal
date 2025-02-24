import React, { createContext, useState, ReactNode, useContext } from "react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import advancedFormat from "dayjs/plugin/advancedFormat";

// Ajouter le plugin weekOfYear
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);


interface CalendarContextProps {
  currentDate: dayjs.Dayjs;
  currentWeek: string;
  currentWeekNumber: number;
  firstDayOfWeek: dayjs.Dayjs;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
}

const CalendarContext = createContext<CalendarContextProps | undefined>(undefined);

const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(dayjs());

  const currentWeekNumber = currentDate.isoWeek(); // ✅ Définit le numéro de semaine
  const currentWeek = currentDate.format("YYYY[w]WW");
  const firstDayOfWeek = currentDate.startOf("isoWeek");

  const goToPreviousWeek = () => {
    setCurrentDate((cd) => cd.subtract(1, "week"));
  };
  const goToNextWeek = () => {
    setCurrentDate((cd) => cd.add(1, "week"));
  };
  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  return (
    <CalendarContext.Provider
      value={{
        currentDate,
        currentWeek,
        currentWeekNumber,
        firstDayOfWeek,
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
