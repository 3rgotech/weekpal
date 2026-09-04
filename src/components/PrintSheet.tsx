import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { DayOfWeek } from "../types";
import Task from "../data/task";
import Event from "../data/event";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { weekHeaderLabel } from "../utils/settings";
import { Weekday, dateOfDay } from "../utils/week";
import iconDark from "../assets/icon_dark.svg";

/**
 * The week as a sheet of A4, landscape.
 *
 * Rendered on every page load and hidden until the print stylesheet asks for it, rather than
 * built on demand: printing is a browser gesture (⌘P as much as the toolbar button), and a sheet
 * that only exists after a click would print blank for anyone who used the shortcut.
 *
 * Deliberately its own markup rather than a print stylesheet over the board. The board is a
 * fixed-height flex layout whose day columns scroll independently — on paper that prints the
 * first few tasks of each day and silently drops the rest, and it has no idea what to do with the
 * vertical layout, which shows one day at a time. This lays the whole week out flowing instead.
 *
 * Black on white whatever the theme: no `dark:` variant appears below, and the print rules in
 * index.css force the page white. A planner printed from dark mode should not come out of the
 * printer as a black rectangle.
 */
const PrintSheet: React.FC = () => {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const dayjs = useDayJs(settings.language);
    const { tasks, events, categories } = useData();
    const { currentDate, firstDayOfWeek, layout } = useCalendar();

    const visible = (task: Task) => settings.showCompletedTasks || !task.completed;

    const categoryName = (id: string): string =>
        categories.find((category) => category.id === id)?.name ?? "";

    // `belongsToProject` is checked here as well as upstream: the board's someday list already
    // excludes backlogs, but "no projects on the sheet" is a property of the sheet, and it should
    // not quietly become false if that list ever widens.
    const tasksOf = (day: DayOfWeek) => tasks.filter(
        (task) => task.dayOfWeek === day && visible(task) && !task.belongsToProject,
    );
    const eventsOf = (day: DayOfWeek) => events.filter((event) => event.dayOfWeek === day);

    const taskLine = (task: Task) => (
        <li key={task.id} className="flex items-baseline gap-1.5 py-[3px] text-[11px] leading-snug">
            <span className={clsx("min-w-0", task.completed && "line-through text-neutral-500")}>
                {task.title}
            </span>
            {task.categoryId && (
                <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500">
                    {categoryName(task.categoryId)}
                </span>
            )}
        </li>
    );

    const eventLine = (event: Event) => (
        <li key={event.id} className="py-[2px] text-[10px] leading-snug text-neutral-600">
            {event.hours && <span className="mr-1 tabular-nums">{event.hours}</span>}
            {event.title}
        </li>
    );

    /**
     * A day, or one of the two undated buckets — the same shape either way.
     *
     * The height is an inline style rather than a Tailwind arbitrary value: how tall a stacked
     * cell should be depends on how many are stacked, and a class name built at runtime is one
     * Tailwind never sees and so never generates.
     */
    const column = (heading: React.ReactNode, day: DayOfWeek, minHeight: string) => (
        <section className="flex flex-col" style={{ minHeight }}>
            {heading}
            <ul className="mt-1">
                {eventsOf(day).map(eventLine)}
                {tasksOf(day).map(taskLine)}
            </ul>
        </section>
    );

    const dayHeading = (date: ReturnType<typeof dayjs>) => (
        <header
            className={clsx(
                "flex items-baseline justify-between pb-1 border-black",
                // Today is marked with weight rather than colour, which is all that survives a
                // black-and-white print — the app marks it in sky blue.
                date.isSame(dayjs(), "day") ? "border-b-2" : "border-b",
            )}
        >
            <span className="text-[13px] font-bold">{date.format("D MMM")}</span>
            <span className="text-[11px] text-neutral-500">{date.format("ddd")}</span>
        </header>
    );

    const bucketHeading = (label: string) => (
        <header className="border-b border-black pb-1">
            <span className="text-[13px] font-bold">{label}</span>
        </header>
    );

    const dateOfColumn = (day: Weekday) =>
        dateOfDay(firstDayOfWeek, day, settings.weekStartsOn);

    /** A working day, printed at full height. */
    const dayColumn = (day: Weekday, minHeight: string) =>
        column(dayHeading(dateOfColumn(day)), `${day}` as DayOfWeek, minHeight);

    // The board's own shape, column for column — a printout that rearranges the week teaches you
    // to read it twice. A column's cells split its height between them, so a stacked pair of
    // weekend days is half-height each and a lone day fills the column.
    const columnHeight = 112;

    return (
        <div className="hidden print:block bg-white text-black">
            <header className="flex items-start justify-between mb-6">
                <h1 className="text-2xl font-bold">
                    {weekHeaderLabel(
                        dayjs(currentDate).format(settings.weekHeaderFormat),
                        { week: t("misc.week"), of: t("misc.of") },
                    )}
                </h1>
                <img src={iconDark} alt="" className="w-8 h-8 grayscale" />
            </header>

            <div
                className="grid gap-x-5"
                style={{ gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))` }}
            >
                {layout.columns.map((column) => (
                    <div className="flex flex-col gap-5" key={column.days[0]}>
                        {column.days.map((day) => (
                            <React.Fragment key={day}>
                                {dayColumn(day, `${Math.floor(columnHeight / column.days.length)}mm`)}
                            </React.Fragment>
                        ))}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-x-5 mt-6">
                {column(bucketHeading(t("main.this_week")), "0", "42mm")}
                {column(bucketHeading(t("main.some_day")), "someday", "42mm")}
            </div>
        </div>
    );
};

export default PrintSheet;
