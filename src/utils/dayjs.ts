import dayjs from 'dayjs';
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import advancedFormat from "dayjs/plugin/advancedFormat";
import customParseFormat from "dayjs/plugin/customParseFormat";
import fr from "../dayjs/fr";
import en from "dayjs/locale/en";

export const getDayJs = (locale: "fr" | "en" = "en") => {
    const locales = {
        fr: fr,
        en: en,
    }
    dayjs.extend(weekOfYear); // use plugin
    dayjs.extend(isoWeek); // use plugin
    dayjs.extend(advancedFormat); // use plugin
    dayjs.extend(customParseFormat); // use plugin
    dayjs.locale(locales[locale]); // use locale
    // dayjs.tz.setDefault('Europe/Paris');

    return dayjs;
};

const useDayJs = (locale: "fr" | "en" = "en") => getDayJs(locale);

export default useDayJs;
