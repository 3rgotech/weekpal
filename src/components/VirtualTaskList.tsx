import React, { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import Task from "../data/task";
import { useShortcuts } from "../contexts/ShortcutsContext";

interface VirtualTaskListProps {
    tasks: Task[];
    /** The scrolling element the rows are measured against. */
    scrollRef: React.RefObject<HTMLElement | null>;
    /** How one task is drawn — the wide board's draggable row, or the phone's. */
    renderTask: (task: Task) => React.ReactNode;
    /** A first guess at a row's height, replaced by measurement. */
    estimate?: number;
    /**
     * How many cards sit side by side.
     *
     * 1 everywhere except the undated buckets on a wide screen, where the grid puts two or three
     * across. Measured off the grid itself by `useGridColumns` rather than declared here, so the
     * windowing and the CSS cannot disagree.
     */
    columns?: number;
}

/** The vertical gap between rows, matching the `gap-2` the unwindowed list lays out with. */
const ROW_GAP = 8;

/**
 * A column's tasks, rendering only the ones near the viewport.
 *
 * Used only past {@link VIRTUALISE_ABOVE}. Below it the column renders every row the plain way,
 * because virtualisation is not free: rows become absolutely positioned, and while a sort is in
 * flight dnd-kit's own transforms — which shift the siblings around the one being dragged — are
 * competing with the positions set here. On a short column that trade buys nothing. On a long one
 * it buys the board staying usable at all.
 *
 * **What is windowed is a row, not a card.** In a day column those are the same thing. In the
 * undated buckets, which lay their cards out two or three across on a wide screen, a row holds
 * `columns` of them and the virtualiser counts `ceil(tasks / columns)` of those. Windowing cards
 * instead would mean every card carrying its own absolute position, which is a grid re-implemented
 * by hand — and the ordering that grid gives for free, left to right and then wrapping, is the
 * one the drag depends on.
 *
 * Heights are measured rather than assumed. A task is one line or three depending on its title,
 * whether it carries a category chip, and whether its subtask progress is showing, so a fixed row
 * height would misplace everything below the first wrapped title. A row of three takes the height
 * of its tallest card, which is what measuring the row rather than the card gets right.
 *
 * The ids handed to `SortableContext` are still the *whole* column, deliberately: it needs the
 * full ordering to work out where a drop lands, and an unmounted row simply has no rectangle to
 * collide with — which is correct, since nobody can drop onto a row they cannot see.
 *
 * Keyboard selection has to be brought back into view from here too. `j` and `k` walk every task
 * in the column, not the handful on screen, and a row that is not mounted has no element of its
 * own to scroll to — so pressing `j` down a long column used to move the selection somewhere
 * invisible and leave it there. The row's own `scrollIntoView` still handles the mounted case and
 * every column below the threshold; this covers the rest.
 */
const VirtualTaskList: React.FC<VirtualTaskListProps> = ({
    tasks,
    scrollRef,
    renderTask,
    estimate = 52,
    columns = 1,
}) => {
    const measured = useRef<Map<number, number>>(new Map());
    const { activeTaskId } = useShortcuts();

    // Read through a ref rather than a dependency: `tasks` is rebuilt on every render of the
    // column, so depending on it would re-run this on every render and yank the list back under
    // anyone scrolling it by hand.
    const latest = useRef(tasks);
    latest.current = tasks;

    const across = Math.max(1, columns);
    const rows = Math.ceil(tasks.length / across);

    const virtualiser = useVirtualizer({
        count: rows,
        getScrollElement: () => scrollRef.current,
        // A first guess only, replaced by the real height as soon as the row is measured. Close
        // to a one-line task plus the gap under it, so the scrollbar starts about the right size.
        estimateSize: (index) => measured.current.get(index) ?? estimate,
        // Keyed off the row's first task rather than its index, so inserting a card at the top
        // does not renumber every mounted row and remount all of them.
        getItemKey: (index) => latest.current[index * across]?.id ?? index,
        // Enough rows above and below to cover a fast scroll, and — more to the point — to keep
        // the neighbours of a dragged row mounted so it has something to sort against.
        overscan: 8,
    });

    /*
     * A window resized across a breakpoint.
     *
     * Every cached height was measured for a row of the old width holding the old number of
     * cards, so keeping them would place the new rows against measurements of rows that no longer
     * exist. Cheaper to forget and re-measure than to be subtly wrong all the way down a long
     * bucket.
     */
    const lastAcross = useRef(across);

    useEffect(() => {
        // Guarded against the mount, where there is nothing cached to forget and the virtualiser
        // has not measured anything yet — throwing that away would be work for its own sake on
        // the one render where the column is already at its slowest.
        if (lastAcross.current === across) {
            return;
        }

        lastAcross.current = across;
        measured.current.clear();
        virtualiser.measure();
        // Only when the column count changes. The virtualiser is a fresh object each render, so
        // listing it would make this fire continuously.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [across]);

    useEffect(() => {
        if (activeTaskId === null) {
            return;
        }

        const index = latest.current.findIndex((task) => task.id === activeTaskId);

        if (index >= 0) {
            // The row it is in, not its position in the column: with three cards across, the
            // fortieth task is on the fourteenth row.
            //
            // `auto` leaves an already-visible row alone, so this only moves the list when the
            // selection has genuinely gone off screen.
            virtualiser.scrollToIndex(Math.floor(index / across), { align: "auto" });
        }
        // Only when the selection moves. The virtualiser is deliberately not a dependency: it is
        // a fresh object each render, and listing it would make this fire continuously.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTaskId, across]);

    return (
        <div
            data-testid="virtual-list"
            // `col-span-full` so the windowed list occupies the whole grid rather than one cell of
            // it: the rows inside are positioned absolutely and lay themselves out.
            className={clsx("relative w-full", across > 1 && "col-span-full")}
            style={{ height: `${virtualiser.getTotalSize()}px` }}
        >
            {virtualiser.getVirtualItems().map((row) => {
                const first = row.index * across;
                const inRow = tasks.slice(first, first + across);

                if (inRow.length === 0) {
                    return null;
                }

                return (
                    <div
                        key={row.key}
                        data-index={row.index}
                        data-testid="virtual-row"
                        ref={(element) => {
                            if (element) {
                                virtualiser.measureElement(element);
                                measured.current.set(row.index, element.offsetHeight);
                            }
                        }}
                        className="absolute top-0 left-0 w-full"
                        style={{
                            transform: `translateY(${row.start}px)`,
                            // Inside the measured height, so the gap between rows is part of what
                            // the virtualiser positions against rather than a margin it cannot see.
                            paddingBottom: `${ROW_GAP}px`,
                            ...(across > 1
                                ? {
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${across}, minmax(0, 1fr))`,
                                    gap: `${ROW_GAP}px`,
                                }
                                : {}),
                        }}
                    >
                        {inRow.map((task) => (
                            <React.Fragment key={task.id}>{renderTask(task)}</React.Fragment>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

export default VirtualTaskList;
