import React, { useRef, useState } from "react";
import { Button, Chip, Spinner } from "@heroui/react";
import clsx from "clsx";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dayjs } from "dayjs";
import Category from "../data/category";
import { WeeklyTask } from "../data/task";
import { DayOfWeek, WeekSummary } from "../types";
import { hasEscapeHatch } from "../utils/deferral";
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
 *   common case. **Someday bottom-right**, and only on a card that has earned it *(rt §6)*: the
 *   offer to give up arrives with the evidence, not on every card.
 * - **Delete top-right, low-contrast, far from a moving thumb.** Fitts's law as an intent tax,
 *   and always with the five-second undo.
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
    const touch = useRef<{ x: number; y: number } | null>(null);

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

    const onTouchStart = (event: React.TouchEvent) => {
        const point = event.touches[0];
        touch.current = point ? { x: point.clientX, y: point.clientY } : null;
    };

    const onTouchEnd = (event: React.TouchEvent) => {
        const start = touch.current;
        const point = event.changedTouches[0];
        touch.current = null;

        if (!start || !point) {
            return;
        }

        const dx = point.clientX - start.x;
        const dy = point.clientY - start.y;

        // Sideways, and clearly so: a scroll that drifts is not a decision to skip.
        if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) {
            return;
        }

        browse(dx < 0 ? 1 : -1);
    };

    const undated = task ? `${task.dayOfWeek}` === "0" : false;

    return (
        <div className="h-full flex flex-col overflow-hidden" data-testid="leftover-stack">
            <header className="flex-none px-4 pt-3 pb-2 flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-semibold text-sky-950 dark:text-white">{t("leftovers.title")}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm underline text-slate-500 dark:text-slate-400"
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
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                        {t("leftovers.empty")}
                    </p>

                    {/* The week it all landed in, bucket by bucket. Counts, not a chart. */}
                    {shape && shape.length > 0 && (
                        <ul className="flex items-stretch gap-1" aria-label={t("leftovers.shape")}>
                            {shape.map((entry) => (
                                <li
                                    key={entry.day}
                                    className="flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 rounded-lg bg-slate-100 dark:bg-sky-950"
                                >
                                    <span className="text-[0.65rem] uppercase text-slate-500 dark:text-slate-400">{entry.label}</span>
                                    <span className="text-base font-semibold tabular-nums text-sky-950 dark:text-white">{entry.count}</span>
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
                        className="flex-1 min-h-0 flex flex-col justify-center px-4 py-2"
                        onTouchStart={onTouchStart}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="flex items-baseline justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
                            <span className="tabular-nums">
                                {t("leftovers.position", { current: position + 1, total: tasks.length })}
                            </span>
                            {tasks.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => browse(1)}
                                    className="underline"
                                >
                                    {t("leftovers.skip")}
                                </button>
                            )}
                        </div>

                        {/* The card. `key` on the id so a resolved card is unmounted rather than
                            morphed into the next one — otherwise the title cross-fades between two
                            tasks and the tap that follows lands on neither. */}
                        <article
                            key={task.id}
                            className={clsx(
                                "relative flex flex-col gap-4 p-4 rounded-xl border",
                                "border-slate-200 bg-white dark:border-sky-900 dark:bg-slate-900",
                                "shadow-sm",
                                busy === task.id && "opacity-50",
                            )}
                            aria-busy={busy === task.id}
                        >
                            <div className="flex items-center gap-2 pr-8">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {undated ? t("main.this_week") : leftoverDate(task).format("ddd D MMM")}
                                </span>

                                {category && (
                                    <Chip size="sm" className={clsx("shrink-0 text-xs rounded-md text-white", category.getColorClass("bg"))}>
                                        <Chip.Label>{category.name}</Chip.Label>
                                    </Chip>
                                )}

                                <DeferralBadge task={task} />
                            </div>

                            {/* Top-right, low-contrast, on the far side from the thumb. */}
                            <button
                                type="button"
                                disabled={busy === task.id}
                                onClick={() => onDelete(task)}
                                aria-label={t("leftovers.delete")}
                                title={t("leftovers.delete")}
                                className="
                                    absolute top-3 right-3 p-1 rounded text-slate-300 dark:text-slate-600
                                    hover:text-red-600 dark:hover:text-red-400
                                    focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                                "
                            >
                                <X size={16} />
                            </button>

                            <p className="text-xl font-medium text-sky-950 dark:text-white break-words">
                                {task.title}
                            </p>

                            <div className="flex items-center justify-between gap-2">
                                <button
                                    type="button"
                                    disabled={busy === task.id}
                                    onClick={() => onDone(task)}
                                    className="
                                        px-3 py-2 rounded-md text-sm font-medium
                                        text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30
                                        focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                                    "
                                >
                                    {t("leftovers.complete")}
                                </button>

                                {/* *(rt §6)* Only once the task has earned it. */}
                                {hasEscapeHatch(task.deferralCount) && (
                                    <button
                                        type="button"
                                        disabled={busy === task.id}
                                        onClick={() => onSomeday(task)}
                                        className="
                                            px-3 py-2 rounded-md text-sm
                                            text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-sky-900
                                            focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50
                                        "
                                    >
                                        {t("leftovers.some_day")}
                                    </button>
                                )}
                            </div>
                        </article>

                        {tasks.length > 1 && (
                            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
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
                                className="w-full py-2 rounded-md text-sm underline bg-slate-100 dark:bg-sky-950 text-slate-700 dark:text-slate-200"
                            >
                                {t("leftovers.undo_delete", { title: undoable.title })}
                            </button>
                        </div>
                    )}

                    {/* Pinned at the bottom, where a thumb is, and padded past the home indicator
                        the same way `DayNav` is. */}
                    <nav
                        className="flex-none border-t border-slate-200 dark:border-sky-900 bg-slate-100 dark:bg-sky-950 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                        aria-label={t("leftovers.rail")}
                    >
                        <LeftoverRail
                            task={task}
                            busy={busy === task.id}
                            variant="bar"
                            onMoveToDay={(day) => onMoveToDay(task, day)}
                            onMoveToWeek={() => onMoveToWeek(task)}
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
                        className="w-full py-2 rounded-md text-sm underline bg-slate-100 dark:bg-sky-950 text-slate-700 dark:text-slate-200"
                    >
                        {t("leftovers.undo_delete", { title: undoable.title })}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LeftoverStack;
