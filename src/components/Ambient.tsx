import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { DayOfWeek } from "../types";
import { isDayDone } from "../utils/dayDone";
import { ambientBadge, ambientTitle, paintFavicon } from "../utils/ambient";

/**
 * Keeps the tab title and the favicon saying what the board has to say.
 *
 * *(rt §9)* Renders nothing. It is the ambient channel — the only thing the board can say to
 * somebody looking at another tab, and the place the day-complete ceremony lands for them.
 *
 * Mounted once beside the board rather than inside a column, because both facts it reports are
 * about the week rather than about any one day.
 */
const Ambient: React.FC = () => {
    const { t } = useTranslation();
    const { leftovers, allTasks } = useData();
    const { thisWeek, currentWeek } = useCalendar();
    const { settings } = useSettings();
    const dayjs = useDayJs(settings.language);

    const today = dayjs();
    const todayDay = `${today.isoWeekday()}` as DayOfWeek;

    /*
     * Only while the board is on the current week.
     *
     * Someone reading back through March should not be told that March's Tuesday is finished —
     * the ambient channel reports on *now*, and the week being looked at is a different question
     * from the week being lived.
     */
    const done = currentWeek === thisWeek && isDayDone(allTasks, todayDay);

    useEffect(() => {
        const state = {
            leftovers: leftovers.length,
            dayDone: done ? t("main.day_done", { day: today.format("dddd") }) : null,
        };

        document.title = ambientTitle(state);
        paintFavicon(ambientBadge(state));
        // `today` is a fresh dayjs on every render; its formatted day name is the stable part.
    }, [leftovers.length, done, t, today.format("dddd")]);

    return null;
};

export default Ambient;
