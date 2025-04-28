import dayjs from 'dayjs';
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
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
    dayjs.locale(locales[locale]); // use locale
    // dayjs.tz.setDefault('Europe/Paris');

    return dayjs;
};

const useDayJs = (locale: "fr" | "en" = "en") => useMemo(() => getDayJs(locale), [locale]);

export default useDayJs;
