import React from 'react'
import Event from '../data/event';
import clsx from 'clsx';
import { useData } from '../contexts/DataContext';
import { Calendar } from 'lucide-react';
import { Chip } from '@heroui/react';

interface EventListProps {
    events: Event[];
}

const EventEntry = ({ event }: { event: Event }) => {
    const { categories } = useData();
    const category = (event.categoryId ? categories.find((c) => c.id === event.categoryId) : null) ?? null;
    return (
        <li
            className={clsx(
                "flex items-center justify-between h-6 transition-colors",
                category?.getColorClass('text')
            )}
        >
            <div
                className="flex-1 flex items-center gap-x-1 overflow-hidden">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                {event.hours && (
                    <span
                        className="text-xs font-semibold whitespace-nowrap"
                    >
                        {event.hours}
                    </span>
                )}
                <h2 className={clsx(
                    "text-xs font-medium truncate",
                )}>
                    {event.title}
                </h2>
            </div>
        </li>
    )
}

const EventList = ({ events }: EventListProps) => {
    const { categories } = useData();
    return (
        <ul className={clsx("px-1 h-auto max-h-40 overflow-y-auto border-b border-gray-200 dark:border-gray-800")}>
            {events.map((event) => (
                <EventEntry key={event.id} event={event} />
            ))}
        </ul>
    )
}

export default EventList