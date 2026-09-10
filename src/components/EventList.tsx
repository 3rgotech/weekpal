import React from 'react'
import Event from '../data/event';
import clsx from 'clsx';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { Calendar, MapPin, UserRound } from 'lucide-react';

interface EventListProps {
    events: Event[];
}

/**
 * One event, at whichever size the board is currently showing them.
 *
 * Collapsed is the default and the old behaviour exactly: an icon, the hours, and a title clamped
 * to two lines. Expanded adds what the provider knew — who called it, where it is, and the opening
 * of its description — each on its own line and each present only when there is something to say,
 * so an event with none of them is the same row either way rather than a row with three gaps in it.
 */
const EventEntry = ({ event, expanded }: { event: Event; expanded: boolean }) => {
    const { categories } = useData();
    const category = (event.categoryId ? categories.find((c) => c.id === event.categoryId) : null) ?? null;

    // Nothing to open out. An event that expands into the same thing it already was reads as the
    // switch having failed.
    const showDetail = expanded && event.hasDetail;

    return (
        <li
            className={clsx(
                // `items-start` once there is more than one line, so the icon sits with the title
                // rather than centring itself against a three-line block.
                "flex justify-between transition-colors",
                showDetail ? "items-start py-1" : "items-center min-h-6",
                category?.getColorClass('text')
            )}
        >
            <div
                className="flex-1 flex items-center gap-x-1 overflow-hidden">
                <Calendar className={clsx("w-4 h-4 shrink-0", showDetail && "mt-0.5 self-start")} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-x-1">
                        {event.hours && (
                            <span
                                className="text-xs font-semibold whitespace-nowrap"
                            >
                                {event.hours}
                            </span>
                        )}
                        <h2 className={clsx(
                            // Same two-line treatment as a task title: these sit in the same narrow column.
                            "text-xs font-medium line-clamp-2 break-words",
                        )}>
                            {event.title}
                        </h2>
                    </div>

                    {showDetail && (
                        /* Dimmed against the title rather than coloured with it: this is context
                           for the event, and three lines at full weight turn a fixed point into
                           the loudest thing in the column. */
                        <div className="mt-0.5 space-y-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
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
            </div>
        </li>
    )
}

const EventList = ({ events }: EventListProps) => {
    const { settings } = useSettings();

    return (
        <ul className={clsx(
            "px-1 h-auto overflow-y-auto border-b border-gray-200 dark:border-gray-800",
            // Expanded rows are three or four times the height, so the same 10rem cap would show
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
