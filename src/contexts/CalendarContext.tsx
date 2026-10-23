import React, { createContext, useState, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
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
import { dateOfWeekCode, weekFromHash } from "../utils/weekHash";

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

/**
 * `allowLayoutPresets` is whether the account may use the named layouts (R14) — Pro. Passed in
 * from `App` rather than read from the account context here, which would pull the adapter
 * factory, and `import.meta` with it, into every test that renders the calendar.
 */
const CalendarProvider: React.FC<{ allowLayoutPresets?: boolean; children: ReactNode }> = ({ allowLayoutPresets = false, children }) => {
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  // Opened on the week the address names, when it names one: a link to a week, or a reload.
  const [currentDate, setCurrentDate] = useState(() => {
    const linked = weekFromHash(window.location.hash);

    return linked ? dateOfWeekCode(linked, weekCodeOf(dayjs(), settings.weekStartsOn)) : dayjs();
  });

  /*
   * Whether the next change of week should replace the history entry rather than add one.
   *
   * Moving between weeks is navigation and gets an entry, so Back walks back through them. The
   * first render, a change of week start and the midnight rollover are not things the user did,
   * and an entry for them would be a Back press that seems to do nothing.
   */
  const replaceNext = useRef(true);

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

  // Without a plan the board keeps the layout everyone has; the stored choice waits (R14).
  const preset = allowLayoutPresets ? settings.layoutPreset : "compressed";

  const layout = useMemo(
    () => weekLayout(workingDays, showNonWorkingDays, weekStartsOn, preset),
    [workingDays, showNonWorkingDays, weekStartsOn, preset],
  );

  /** Null for the two undated buckets, which are the whole point of their being undated. */
  const dateOf = (day: DayOfWeek): Dayjs | null => {
    if (day === "0" || day === "someday") {
      return null;
    }

    return dateOfDay(firstDayOfWeek, parseInt(day, 10) as Weekday, weekStartsOn);
  };

  // A different week start can name the same dates by another code; that is not a move. Declared
  // before the effect below, so it has run by the time that one decides.
  useEffect(() => {
    replaceNext.current = true;
  }, [weekStartsOn]);

  /*
   * The address follows the week on screen; Back, Forward and an edited address move the week.
   *
   * The two directions cannot loop: arriving from the address sets a week whose hash is already
   * there, so the effect writing it finds nothing to do.
   */
  useEffect(() => {
    const hash = `#${currentWeek}`;
    const replace = replaceNext.current;

    replaceNext.current = false;

    if (window.location.hash === hash) {
      return;
    }

    // `history` rather than assigning `location.hash`, which would also fire `hashchange` and
    // have the listener below re-read what was just written.
    const url = `${window.location.pathname}${window.location.search}${hash}`;

    if (replace) {
      window.history.replaceState(window.history.state, "", url);
    } else {
      window.history.pushState(window.history.state, "", url);
    }
  }, [currentWeek]);

  useEffect(() => {
    const follow = () => {
      const linked = weekFromHash(window.location.hash);

      if (linked) {
        setCurrentDate(dateOfWeekCode(linked, weekCodeOf(dayjs(), weekStartsOn)));
      }
    };

    window.addEventListener("popstate", follow);
    window.addEventListener("hashchange", follow);

    return () => {
      window.removeEventListener("popstate", follow);
      window.removeEventListener("hashchange", follow);
    };
  }, [dayjs, weekStartsOn]);

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
      setCurrentDate((cd) => {
        if (weekCodeOf(cd, weekStartsOn) === weekCodeOf(dayjs(), weekStartsOn)) {
          return cd;
        }

        replaceNext.current = true;

        return dayjs();
      });
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
