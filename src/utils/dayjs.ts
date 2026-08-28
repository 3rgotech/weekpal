import dayjs, { Dayjs } from 'dayjs';
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import relativeTime from "dayjs/plugin/relativeTime";
import weekOfYear from "dayjs/plugin/weekOfYear";
import fr from "../dayjs/fr";
import en from "dayjs/locale/en";
import { useMemo } from 'react';

export const getDayJs = (locale: "fr" | "en" = "en") => {
    const locales = {
        fr: fr,
        en: en,
    }
    dayjs.extend(weekOfYear); // use plugin
    dayjs.extend(isoWeek); // use plugin
    dayjs.extend(advancedFormat); // use plugin
    dayjs.extend(customParseFormat); // use plugin
    dayjs.extend(isSameOrAfter); // use plugin
    dayjs.extend(isSameOrBefore); // use plugin
    // "3 hours ago" — a changelog and a note thread are read by recency, not by date.
    dayjs.extend(relativeTime); // use plugin
    dayjs.locale(locales[locale]); // use locale
    // dayjs.tz.setDefault('Europe/Paris');

    return dayjs;
};

/**
 * The Monday of a `2026w30` week code.
 *
 * Not `dayjs(weekCode, "GGGG[w]WW")`, which is what this replaces everywhere: dayjs cannot parse
 * ISO week-year tokens, and rather than failing it returns **today** and reports itself valid. So
 * every week code silently resolved to the current week — a task's `date` was right only for
 * tasks in the week you happened to be looking at, and wrong, invisibly, for every other.
 *
 * ISO's own definition instead: 4 January is always in week 1, so the Monday of week 1 is the
 * start of that week, and every later week is a multiple of seven days from it. That needs no
 * reference date, which is the other half of the bug — the old form inherited today's month and
 * year and drifted with them.
 */
export const weekCodeToDate = (weekCode: string): Dayjs => {
    const [year, week] = weekCode.split('w').map((part) => parseInt(part, 10));
    const firstWeek = getDayJs()(`${year}-01-04`).startOf('isoWeek');

    return firstWeek.add(week - 1, 'week');
};

const useDayJs = (locale: "fr" | "en" = "en") => useMemo(() => getDayJs(locale), [locale]);

export default useDayJs;
