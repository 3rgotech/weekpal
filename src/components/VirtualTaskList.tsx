import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Task from "../data/task";

interface VirtualTaskListProps {
    tasks: Task[];
    /** The scrolling element the rows are measured against. */
    scrollRef: React.RefObject<HTMLElement | null>;
    /** How one task is drawn — the wide board's draggable row, or the phone's. */
    renderTask: (task: Task) => React.ReactNode;
    /** A first guess at a row's height, replaced by measurement. */
    estimate?: number;
}

/**
 * A column's tasks, rendering only the ones near the viewport.
 *
 * Used only past {@link VIRTUALISE_ABOVE}. Below it the column renders every row the plain way,
 * because virtualisation is not free: rows become absolutely positioned, and while a sort is in
 * flight dnd-kit's own transforms — which shift the siblings around the one being dragged — are
 * competing with the positions set here. On a short column that trade buys nothing. On a long one
 * it buys the board staying usable at all.
 *
 * Heights are measured rather than assumed. A task is one line or three depending on its title,
 * whether it carries a category chip, and whether its subtask progress is showing, so a fixed row
 * height would misplace everything below the first wrapped title.
 *
 * The ids handed to `SortableContext` are still the *whole* column, deliberately: it needs the
 * full ordering to work out where a drop lands, and an unmounted row simply has no rectangle to
 * collide with — which is correct, since nobody can drop onto a row they cannot see.
 */
const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
    tasks,
    scrollRef,
    renderTask,
    estimate = 52,
}) => {
    const measured = useRef<Map<string, number>>(new Map());

    const virtualiser = useVirtualizer({
        count: tasks.length,
        getScrollElement: () => scrollRef.current,
        // A first guess only, replaced by the real height as soon as the row is measured. Close
        // to a one-line task plus the gap under it, so the scrollbar starts about the right size.
        estimateSize: (index) => measured.current.get(tasks[index]?.id ?? "") ?? estimate,
        getItemKey: (index) => tasks[index]?.id ?? index,
        // Enough rows above and below to cover a fast scroll, and — more to the point — to keep
        // the neighbours of a dragged row mounted so it has something to sort against.
        overscan: 8,
    });

    return (
        <div
            data-testid="virtual-list"
            className="relative w-full"
            style={{ height: `${virtualiser.getTotalSize()}px` }}
        >
            {virtualiser.getVirtualItems().map((row) => {
                const task = tasks[row.index];

                if (!task) {
                    return null;
                }

                return (
                    <div
                        key={task.id}
                        data-index={row.index}
                        ref={(element) => {
                            if (element) {
                                virtualiser.measureElement(element);
                                measured.current.set(task.id, element.offsetHeight);
                            }
                        }}
                        className="absolute top-0 left-0 w-full"
                        style={{ transform: `translateY(${row.start}px)` }}
                    >
                        {renderTask(task)}
                    </div>
                );
            })}
        </div>
    );
};

export default VirtualTaskList;
