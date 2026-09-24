import React from 'react'
import Event from '../data/event';
import clsx from 'clsx';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { MapPin, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { tagStyle } from '../utils/color';

interface EventListProps {
    events: Event[];
}

/**
 * One event, at whichever size the board is currently showing them.
 *
 * Collapsed is the default: the hours stacked in a narrow column, and a title clamped to two
 * lines, on a tint of the event's category. All-day events are a solid band with no hours. Expanded adds what the provider knew — who called it, where it is, and the opening
 * of its description — each on its own line and each present only when there is something to say,
 * so an event with none of them is the same row either way rather than a row with three gaps in it.
 */
const EventEntry = ({ event, expanded }: { event: Event; expanded: boolean }) => {
    const { t } = useTranslation();
    const { categories } = useData();
    const category = (event.categoryId ? categories.find((c) => c.id === event.categoryId) : null) ?? null;

    // Nothing to open out. An event that expands into the same thing it already was reads as the
    // switch having failed.
    const showDetail = expanded && event.hasDetail;

    if (event.isAllDay) {
        return (
            <li
                className="wp-event wp-event--allday flex items-center gap-2 rounded-[5px] py-[5px] pl-2.5 pr-2"
                style={tagStyle(category?.hex)}
            >
                <span className="wp-event__start w-9 shrink-0 text-[11px] font-semibold leading-[1.45]">
                    {t("main.all_day")}
                </span>
                <span className="flex-1 min-w-0 text-xs font-semibold leading-[1.35] text-wp-fg line-clamp-2 break-words">
                    {event.title}
                </span>
            </li>
        );
    }

    return (
        <li
            className="wp-event flex items-center gap-2 rounded-r-[5px] rounded-l-[2px] px-2 py-[5px]"
            style={tagStyle(category?.hex)}
        >
            <div className={clsx("w-9 shrink-0 flex flex-col leading-[1.45] tabular-nums", showDetail && "self-start")}>
                <span className="wp-event__start text-[11px] font-semibold">{event.startHour}</span>
                <span className="text-[11px] font-medium text-wp-muted">{event.endHour}</span>
            </div>
            <div className="flex-1 min-w-0">
                {/* Same clamp as a task title: these sit in the same narrow column. */}
                <h2 className="text-xs font-medium leading-[1.35] text-wp-fg line-clamp-2 break-words">
                    {event.title}
                </h2>

                {showDetail && (
                    /* Dimmed against the title: this is context for the event, and three lines
                       at full weight turn a fixed point into the loudest thing in the column. */
                    <div className="mt-0.5 space-y-0.5 text-[11px] leading-snug text-wp-muted">
                        {event.organiser && (
                            <p className="flex items-center gap-x-1 truncate">
                                <UserRound className="w-3 h-3 shrink-0" />
                                <span className="truncate">{event.organiser}</span>
                            </p>
                        )}
                        {event.location && (
                            <p className="flex items-center gap-x-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{event.location}</span>
                            </p>
                        )}
                        {event.description && (
                            /* Two lines, and no more.

                               The server already collapsed this to plain text and cut it to
                               400 characters, which stops a page-long invite crossing the
                               wire; the clamp is what stops the four hundred it did send from
                               pushing a Tuesday's tasks off the bottom of the column. */
                            <p className="line-clamp-2 break-words" title={event.description}>
                                {event.description}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </li>
    )
}

const EventList = ({ events }: EventListProps) => {
    const { settings } = useSettings();

    return (
        <ul className={clsx(
            "flex flex-col gap-1 px-3 pb-2 h-auto overflow-y-auto shrink-0",
            // Expanded rows are three or four times the height, so the same cap would show
            // one and a half events and hide the rest behind a scroll nobody asked for. It still
            // has a ceiling: the calendar is what the day is planned *around*, and a column that
            // is all meetings has stopped being a to-do list.
            settings.expandEvents ? "max-h-64" : "max-h-40",
        )}>
            {events.map((event) => (
                <EventEntry key={event.id} event={event} expanded={settings.expandEvents} />
            ))}
        </ul>
    )
}

export default EventList
