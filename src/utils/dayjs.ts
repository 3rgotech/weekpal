import dayjs from 'dayjs';
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import advancedFormat from "dayjs/plugin/advancedFormat";

export const getDayJs = () => {
    dayjs.extend(weekOfYear); // use plugin
    dayjs.extend(isoWeek); // use plugin
    dayjs.extend(advancedFormat); // use plugin
    // dayjs.locale('fr'); // use locale
    // dayjs.tz.setDefault('Europe/Paris');

    return dayjs;
};

const useDayJs = () => getDayJs();

export default useDayJs;
