import React, { useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import CategoryTag from "./CategoryTag";
import clsx from "clsx";
import { Check, Clock, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dayjs } from "dayjs";
import Category from "../data/category";
import { WeeklyTask } from "../data/task";
import { DayOfWeek, WeekSummary } from "../types";
import { hasEscapeHatch } from "../utils/deferral";
import { formatEstimate } from "../utils/estimate";
import DeferralBadge from "./DeferralBadge";
import LeftoverRail from "./LeftoverRail";
import LeftoverSummary from "./LeftoverSummary";

/** One bucket of the incoming week and how much is already in it. */
export interface WeekShapeEntry {
    day: DayOfWeek;
    label: string;
    count: number;
}

interface LeftoverStackProps {
    tasks: WeeklyTask[];
    loaded: boolean;
    summary: WeekSummary | null;
    categories: Category[];
    /** The id being written, so the card it belongs to can hold still. */
    busy: string | null;
    /** Which date a leftover sat on, as this user's board would have drawn it. */
    leftoverDate: (task: WeeklyTask) => Dayjs;
    onMoveToDay: (task: WeeklyTask, day: DayOfWeek) => void;
    onMoveToWeek: (task: WeeklyTask) => void;
    onSomeday: (task: WeeklyTask) => void;
    onDone: (task: WeeklyTask) => void;
    onDelete: (task: WeeklyTask) => void;
    undoable: WeeklyTask | null;
    onUndo: () => void;
    onClose: () => void;
    /** This week, bucket by bucket, for the moment the last card leaves. Null when unknown. */
    shape: WeekShapeEntry[] | null;
}

/** How far a finger has to travel sideways before it is a swipe rather than a wobble. */
const SWIPE_THRESHOLD = 40;

/** How long a flung card takes to leave the screen before the next one takes its place. */
const FLING_MS = 180;

/**
 * The leftover review on a phone: one card at a time.
 *
 * *(rt §7)* **Mobile is the primary design, not an adaptation.** The three-beat story the wide
 * board tells in space — what slipped, what to do with it, where it lands — is rotated into time:
 * a stats line at the top, the card large in the middle, the incoming week's rail pinned at the
 * bottom as the drop target.
 *
 * - **"3 of 7" is not decoration.** The worst mobile review flow is one with no visible end;
 *   people abandon it halfway and feel they have left something unfinished.
 * - **Swipe browses, tap commits.** A sideways swipe moves to the next card without recording a
 *   decision, so the stack is not a forced march — a skipped task is simply still a leftover.
 *   No new state, no new UI: it is the same list, read from a different place.
 * - **Done bottom-left, in the thumb zone.** "I already did this and forgot to tick it" is the
 *   common case. **Someday** sits on the rail beside "no set day", and only on a card that has
 *   earned it *(rt §6)*: the offer to give up arrives with the evidence, not on every card.
 * - **Delete is a labelled button**, at the far end of Done's row and in a muted tone:
 *   a bare `×` read as "close the card", not as "delete the task". Always with the five-second
 *   undo.
 * - **The card moves with the finger.** A swipe drags it, a release past the threshold flings it
 *   off-screen, and anything shorter springs it back — with the next card peeking from behind,
 *   so the stack looks like one.
 *
 * When the last card leaves, the stats line expands into the shape of the week it all landed
 * in — the answer to "and now what does Monday look like?", which is the question a review
 * leaves behind.
 */
const LeftoverStack: React.FC<LeftoverStackProps> = ({
    tasks, loaded, summary, categories, busy, leftoverDate,
    onMoveToDay, onMoveToWeek, onSomeday, onDone, onDelete,
    undoable, onUndo, onClose, shape,
}) => {
    const { t } = useTranslation();
    const [index, setIndex] = useState(0);
    const touch = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
    // How far the card is dragged, and whether the finger is still on it: while it is, the card
    // tracks the finger exactly; once it lets go, the transition carries it home or away.
    const [dragX, setDragX] = useState(0);
    const [dragging, setDragging] = useState(false);

    // Clamped rather than reset: a resolved card leaves the list, and the same index is already
    // the next card. Only when the last one goes does the cursor step back.
    const position = tasks.length === 0 ? 0 : Math.min(index, tasks.length - 1);
    const task = tasks[position] ?? null;
    const category = task ? categories.find((c) => c.id === task.categoryId) : undefined;

    const browse = (step: 1 | -1) => {
        if (tasks.length < 2) {
            return;
        }

        setIndex((position + step + tasks.length) % tasks.length);
    };

    /** Off the screen on the side it was pushed towards, then the next card. */
    const fling = (step: 1 | -1) => {
        if (tasks.length < 2) {
            setDragX(0);
            return;
        }

        setDragX(step === 1 ? -window.innerWidth : window.innerWidth);
        window.setTimeout(() => {
            // The next card mounts under its own key, so it starts centred without animating in.
            setDragX(0);
            browse(step);
        }, FLING_MS);
    };

    const onTouchStart = (event: React.TouchEvent) => {
        const point = event.touches[0];
        touch.current = point ? { x: point.clientX, y: point.clientY, horizontal: null } : null;
    };

    const onTouchMove = (event: React.TouchEvent) => {
        const start = touch.current;
        const point = event.touches[0];

        if (!start || !point || tasks.length < 2) {
            return;
        }

        const dx = point.clientX - start.x;
        const dy = point.clientY - start.y;

        // Decided once, on the first clear movement: a vertical scroll never starts dragging the
        // card halfway through.
        if (start.horizontal === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
            start.horizontal = Math.abs(dx) > Math.abs(dy);
        }

        if (start.horizontal) {
            setDragging(true);
            setDragX(dx);
        }
    };

    const onTouchEnd = (event: React.TouchEvent) => {
        const start = touch.current;
        const point = event.changedTouches[0];
        touch.current = null;
        setDragging(false);

        if (!start || !point) {
            setDragX(0);
            return;
        }

        const dx = point.clientX - start.x;
        const dy = point.clientY - start.y;

        // Sideways, and clearly so: a scroll that drifts is not a decision to skip.
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) {
            setDragX(0);
            return;
        }

        fling(dx < 0 ? 1 : -1);
    };

    const undated = task ? `${task.dayOfWeek}` === "0" : false;
    const estimate = task ? formatEstimate(task.estimatedMinutes)?.replace(/^~/, "") ?? null : null;

    return (
        <div className="h-full flex flex-col overflow-hidden" data-testid="leftover-stack">
            <header className="flex-none px-4 pt-3 pb-2 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-[-0.2px] text-wp-fg">{t("leftovers.title")}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm underline text-wp-muted"
                    >
                        {tasks.length === 0 ? t("leftovers.done") : t("leftovers.later")}
                    </button>
                </div>

                <LeftoverSummary summary={summary} />
            </header>

            {!loaded && (
                <div className="flex-1 flex justify-center items-center">
                    <Spinner size="lg" />
                </div>
            )}

            {loaded && !task && (
                <div className="flex-1 flex flex-col justify-center gap-4 px-4">
                    <p className="text-center text-sm text-wp-muted">
                        {t("leftovers.empty")}
                    </p>

                    {/* The week it all landed in, bucket by bucket. Counts, not a chart. */}
                    {shape && shape.length > 0 && (
                        <ul className="flex items-stretch gap-1" aria-label={t("leftovers.shape")}>
                            {shape.map((entry) => (
                                <li
                                    key={entry.day}
                                    className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 rounded-lg bg-wp-track"
                                >
                                    <span className="text-[10px] font-bold tracking-[0.8px] uppercase text-wp-muted">{entry.label}</span>
                                    <span className="text-base font-semibold tabular-nums text-wp-fg">{entry.count}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Button variant="primary" onPress={onClose}>{t("leftovers.done")}</Button>
                </div>
            )}

            {loaded && task && (
                <>
                    <div
                        className="flex-1 min-h-0 flex flex-col justify-center px-4 py-2 overflow-x-hidden"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="flex items-baseline justify-between text-sm text-wp-muted mb-2">
                            <span className="tabular-nums">
                                {t("leftovers.position", { current: position + 1, total: tasks.length })}
                            </span>
                            {tasks.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => fling(1)}
                                    className="underline"
                                >
                                    {t("leftovers.skip")}
                                </button>
                            )}
                        </div>

                        <div className="relative">
                            {/* The next card, peeking from behind: there is more than this one,
                                and swiping this one away is what reaches it. */}
                            {tasks.length > 1 && (
                                <div
                                    className="absolute inset-0 translate-y-3 scale-[0.94] rounded-xl border border-wp-border-strong bg-wp-card opacity-70"
                                    aria-hidden="true"
                                />
                            )}

                            {/* The card. `key` on the id so a resolved card is unmounted rather
                                than morphed into the next one — otherwise the title cross-fades
                                between two tasks and the tap that follows lands on neither. */}
                            <article
                                key={task.id}
                                className={clsx(
                                    "relative flex flex-col gap-4 p-4 rounded-xl border touch-pan-y",
                                    "border-wp-border bg-wp-card",
                                    "shadow-wp-pop",
                                    !dragging && "transition-transform duration-200 ease-out",
                                    busy === task.id && "opacity-50",
                                )}
                                style={dragX === 0 ? undefined : { transform: `translateX(${dragX}px) rotate(${dragX / 25}deg)` }}
                                aria-busy={busy === task.id}
                            >
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-wp-muted">
                                    <span>
                                        {undated
                                            ? t("leftovers.planned_that_week")
                                            : t("leftovers.planned_on", { date: leftoverDate(task).format("ddd D MMM") })}
                                    </span>

                                    {estimate && (
                                        <span className="inline-flex items-center gap-1 tabular-nums">
                                            <Clock size={12} aria-hidden="true" />
                                            {estimate}
                                        </span>
                                    )}

                                    <DeferralBadge task={task} />
                                </div>

                                <div className="flex flex-col gap-2">
                                    {category && (
                                        <div>
                                            <CategoryTag category={category} />
                                        </div>
                                    )}

                                    <p className="text-xl font-medium text-wp-fg break-words">
                                        {task.title}
                                    </p>
                                </div>

                                {/* Both ways a card ends without moving: Done in the thumb's corner,
                                    delete at the far end, muted. Some day is a destination, so it
                                    sits on the rail with the others. */}
                                <div className="flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        disabled={busy === task.id}
                                        onClick={() => onDone(task)}
                                        className="
                                            inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold
                                            border border-wp-border-strong text-wp-fg
                                            active:border-wp-accent active:text-wp-accent
                                            focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
                                        "
                                    >
                                        <Check size={16} aria-hidden="true" />
                                        {t("leftovers.complete")}
                                    </button>

                                    {/* A labelled button rather than an `×`, which read as closing
                                        the card. */}
                                    <button
                                        type="button"
                                        disabled={busy === task.id}
                                        onClick={() => onDelete(task)}
                                        className="
                                            inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm
                                            text-wp-muted active:text-wp-danger active:bg-wp-danger-soft
                                            focus-visible:outline-2 focus-visible:outline-wp-accent disabled:opacity-50
                                        "
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                        {t("leftovers.delete")}
                                    </button>
                                </div>
                            </article>
                        </div>

                        {tasks.length > 1 && (
                            <p className="mt-3 text-center text-xs text-wp-muted">
                                {t("leftovers.swipe_hint")}
                            </p>
                        )}
                    </div>

                    {/* Above the rail, not over it: the rail is the thing most likely to be tapped
                        next, and a toast that covered it would eat the tap. */}
                    {undoable && (
                        <div className="flex-none px-4 pb-2">
                            <button
                                type="button"
                                onClick={onUndo}
                                className="w-full py-2 rounded-md text-sm underline bg-wp-track text-wp-fg"
                            >
                                {t("leftovers.undo_delete", { title: undoable.title })}
                            </button>
                        </div>
                    )}

                    {/* Pinned at the bottom, where a thumb is, and padded past the home indicator
                        the same way `DayNav` is. */}
                    <nav
                        className="flex-none flex flex-col gap-2 border-t border-wp-border bg-wp-chrome px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                        aria-label={t("leftovers.rail")}
                    >
                        {/* Named, or seven numbers at the bottom of the screen read as a footer
                            rather than as the places the card can go. */}
                        <span className="text-[11px] font-bold uppercase tracking-[0.8px] text-wp-muted" aria-hidden="true">
                            {t("leftovers.rail")}
                        </span>
                        <LeftoverRail
                            task={task}
                            busy={busy === task.id}
                            variant="bar"
                            onMoveToDay={(day) => onMoveToDay(task, day)}
                            onMoveToWeek={() => onMoveToWeek(task)}
                            // *(rt §6)* Only once the task has earned it.
                            onSomeday={hasEscapeHatch(task.deferralCount) ? () => onSomeday(task) : undefined}
                        />
                    </nav>
                </>
            )}

            {/* Nothing left, but a delete still on offer: the undo outlives the card it came from. */}
            {loaded && !task && undoable && (
                <div className="flex-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={onUndo}
                        className="w-full py-2 rounded-md text-sm underline bg-wp-track text-wp-fg"
                    >
                        {t("leftovers.undo_delete", { title: undoable.title })}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeftoverStack;
