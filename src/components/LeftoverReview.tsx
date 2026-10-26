import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Spinner } from "@heroui/react";
import CategoryTag from "./CategoryTag";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useData } from "../contexts/DataContext";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs, { weekCodeToDate } from "../utils/dayjs";
import { weekHeaderLabel } from "../utils/settings";
import { Weekday, boardDayOrder, dateOfWeekDay } from "../utils/week";
import { useVerticalLayout } from "../utils/layout";
import { WeeklyTask } from "../data/task";
import { DayOfWeek } from "../types";
import LeftoverActions from "./LeftoverActions";
import LeftoverStack, { WeekShapeEntry } from "./LeftoverStack";
import LeftoverSummary from "./LeftoverSummary";
import { useProTeaser } from "../contexts/proTeaser";

/** The week whose review has already been seen. Per browser: nagging is a per-device concern. */
const REVIEWED_KEY = "leftover-review-week";

/** How long the loaded list is trusted before reopening the review goes and looks again. */
const STALE_AFTER = 5 * 60 * 1000;

interface LeftoverReviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The weekly look back at what never got done.
 *
 * Opens by itself once a week, and only when there is something in it — a modal that greets an
 * empty list is a modal that teaches people to dismiss it unread. Every row offers the four ways
 * a leftover ends: it was done and never ticked, it stopped mattering, it belongs in this week,
 * or it belongs to no week at all.
 *
 * Two bodies, one review. On a wide screen it is a list grouped by the week each task was left
 * in, with the rail of day targets under every row. On a phone it is `LeftoverStack`: one card
 * at a time, the rail pinned at the bottom *(rt §7)*. Which one renders is the same question as
 * which board mounted, so it is answered by the same hook. Everything that is not layout — when
 * it opens, what an action does, the five-second undo — is here, once.
 *
 * Above either body sits last week in one line *(R23)*: "Last week: 14 done, 5 moved."
 *
 * The list itself lives in `DataContext`, so acting on a row here and the top bar's badge cannot
 * disagree. Writes queue through the same store the board uses: this works offline exactly as the
 * board does, and a task resolved here is resolved everywhere.
 */
const LeftoverReview: React.FC<LeftoverReviewProps> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  const {
    leftovers,
    leftoversLoaded,
    refreshLeftovers,
    categories,
    completeTask,
    deleteTask,
    rescueTask,
    relocateTask,
    restoreLeftover,
    lastWeekSummary,
    refreshLastWeekSummary,
    allTasks,
  } = useData();

  const { thisWeek, currentWeek, layout, dateOf } = useCalendar();
  const vertical = useVerticalLayout();
  // The first-run tour goes first. See the auto-open effect below.
  const { blocking: onboarding } = useOnboarding();

  /**
   * Which date a leftover sat on, as this user's board would have drawn it.
   *
   * Not `task.date`, which is the ISO date: a Sunday belongs to the start of its week rather than
   * the end of it once the week starts on Sunday, and a review that dates it a week out is a
   * review nobody trusts.
   */
  const leftoverDate = (task: WeeklyTask) => dateOfWeekDay(
    weekCodeToDate(task.weekCode),
    parseInt(`${task.dayOfWeek}`, 10) as Weekday,
    settings.weekStartsOn,
  );
  const [busy, setBusy] = useState<string | null>(null);

  /*
   * The last deleted task, offered back for five seconds.
   *
   * *(rt §7)* Delete is the one action in this dialog that cannot be reasoned about afterwards —
   * every other one leaves the task somewhere you can find it. The delete itself is immediate;
   * this is a revival, which the write path already supports (an upsert against a soft-deleted
   * row restores it), rather than a deferred delete that a closed tab would lose.
   */
  const [undoable, setUndoable] = useState<WeeklyTask | null>(null);

  useEffect(() => {
    if (undoable === null) {
      return;
    }

    const timer = window.setTimeout(() => setUndoable(null), 5000);

    return () => window.clearTimeout(timer);
  }, [undoable]);
  const refreshedAt = useRef(Date.now());
  const { reviewClosed } = useProTeaser();


  const reviewed = (): string | null => {
    try {
      return localStorage.getItem(REVIEWED_KEY);
    } catch {
      // A browser with storage blocked reviews every load rather than never.
      return null;
    }
  };

  // Once per week, and never on an empty list. `onOpenChange` is deliberately absent from the
  // dependencies: it is the setter of the caller's state, and re-running this on every render of
  // the parent would reopen a modal the user has just closed.
  //
  // `onboarding` is in them, and has to be: the first-run tour takes the floor before the board
  // has finished drawing, and this would otherwise cover the very columns it is pointing at. The
  // review is not skipped, only held — when the tour ends, this effect runs again and lets
  // itself in as usual.
  //
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!leftoversLoaded || leftovers.length === 0 || reviewed() === thisWeek || onboarding) {
      return;
    }

    onOpenChange(true);
  }, [leftoversLoaded, leftovers.length, thisWeek, onboarding]);

  // A board left open for days would otherwise reopen showing the list it built on Monday.
  useEffect(() => {
    if (isOpen && Date.now() - refreshedAt.current > STALE_AFTER) {
      refreshedAt.current = Date.now();
      refreshLeftovers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // The line above the inbox. Asked for on open rather than on load: it is only ever read here,
  // and a request on every page load for a line nobody is looking at is a request too many.
  useEffect(() => {
    if (isOpen) {
      refreshLastWeekSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const close = () => {
    try {
      localStorage.setItem(REVIEWED_KEY, thisWeek);
    } catch {
      // Not worth failing the close over: the cost is being asked again next load.
    }

    onOpenChange(false);

    // After the review, never inside it: the one Pro teaser may appear on the board now, if the
    // server's rules allow. Reported on every close; the server counts each week once.
    reviewClosed(thisWeek);
  };

  /** Every action settles the task, so the context drops it and the row goes with it. */
  const resolve = async (task: WeeklyTask, action: () => void | Promise<void>) => {
    setBusy(task.id);

    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  // Grouped by the week they were left in, which the sort already puts in order.
  const weeks = useMemo(() => {
    const grouped = new Map<string, WeeklyTask[]>();

    leftovers.forEach((task) => {
      grouped.set(task.weekCode, [...(grouped.get(task.weekCode) ?? []), task]);
    });

    return [...grouped.entries()];
  }, [leftovers]);

  const total = leftovers.length;

  /**
   * This week, bucket by bucket, for the moment the stack empties.
   *
   * Only when the board is showing this week: `allTasks` is the week on screen, and counting
   * some other week's columns under this week's labels would be a confident wrong answer. Null
   * says "unknown", and the stack draws nothing rather than zeros.
   */
  const shape = useMemo((): WeekShapeEntry[] | null => {
    if (currentWeek !== thisWeek) {
      return null;
    }

    const label = (day: DayOfWeek): string => {
      if (day === "0") {
        return t("main.this_week_short");
      }

      if (day === "someday") {
        return t("main.some_day_short");
      }

      return dateOf(day)?.format("dd") ?? "";
    };

    return boardDayOrder(layout).map((day) => ({
      day,
      label: label(day),
      count: allTasks.filter((task) => task.dayOfWeek === day && !task.completed && !task.belongsToProject).length,
    }));
  }, [allTasks, currentWeek, thisWeek, layout, dateOf, t]);

  const undo = () => {
    if (!undoable) {
      return;
    }

    restoreLeftover(undoable);
    setUndoable(null);
  };

  const remove = (task: WeeklyTask) => resolve(task, () => {
    deleteTask(task);
    // Held so the undo can offer it back. The delete itself is not deferred — a delay would
    // lose it if the tab closed, and reviving a deleted task is something the write path
    // already does.
    setUndoable(task);
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      {/* On a phone, a sheet that stops under the top bar and a clear backdrop: the board's own
          chrome — the mark, the menu — stays in view, so the review reads as part of the app
          rather than as a screen that replaced it. */}
      <Modal.Backdrop variant={vertical ? "transparent" : undefined}>
        <Modal.Container size={vertical ? "full" : "lg"} scroll="inside" placement={vertical ? "bottom" : undefined}>
          {vertical ? (
            <Modal.Dialog className="!p-0 !h-[calc(100%-56px-env(safe-area-inset-top))] !min-h-0 !rounded-t-2xl border-t border-wp-border-strong">
              <LeftoverStack
                tasks={leftovers}
                loaded={leftoversLoaded}
                summary={lastWeekSummary}
                categories={categories}
                busy={busy}
                leftoverDate={leftoverDate}
                onMoveToDay={(task, day) => resolve(task, () => relocateTask(task, { weekCode: thisWeek, dayOfWeek: day }))}
                onMoveToWeek={(task) => resolve(task, () => rescueTask(task, "thisWeek"))}
                onSomeday={(task) => resolve(task, () => rescueTask(task, "someday"))}
                onDone={(task) => resolve(task, () => completeTask(task))}
                onDelete={remove}
                undoable={undoable}
                onUndo={undo}
                onClose={close}
                shape={shape}
              />
            </Modal.Dialog>
          ) : (
          <Modal.Dialog>
            <Modal.Header className="flex flex-col gap-1">
              <Modal.Heading>{t("leftovers.title")}</Modal.Heading>
              {/* The two numbers on one line, then what to do about them: three grey lines in a
                  row read as one block nobody parses. */}
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm font-normal text-wp-muted">
                <span className="text-wp-fg-secondary">
                  {leftoversLoaded ? t("leftovers.summary", { count: total }) : t("leftovers.loading")}
                </span>
                {lastWeekSummary && lastWeekSummary.done + lastWeekSummary.moved + lastWeekSummary.left > 0 && (
                  <span aria-hidden="true">·</span>
                )}
                <LeftoverSummary summary={lastWeekSummary} />
              </div>
              {total > 0 && (
                <p className="mt-2 text-sm font-normal text-wp-muted">{t("leftovers.intro")}</p>
              )}
            </Modal.Header>

            <Modal.Body>
          {!leftoversLoaded && (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          )}

          {leftoversLoaded && total === 0 && (
            <p className="py-6 text-center text-sm text-wp-muted">
              {t("leftovers.empty")}
            </p>
          )}

          {weeks.map(([weekCode, weekTasks]) => (
            <section key={weekCode} className="flex flex-col gap-2 mt-4 first:mt-1">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.8px] text-wp-muted">
                {weekHeaderLabel(
                  weekCodeToDate(weekCode).format(settings.weekHeaderFormat),
                  { week: t("misc.week"), of: t("misc.of") },
                )}
              </h3>

              <ul className="flex flex-col gap-2">
                {weekTasks.map((task) => {
                  const category = categories.find((c) => c.id === task.categoryId);
                  // The undated bucket has no weekday to keep, so "same day" would be the very
                  // same move as "this week" — it is left out rather than duplicated.
                  const undated = `${task.dayOfWeek}` === "0";

                  return (
                    <li
                      key={task.id}
                      className={clsx(
                        "flex flex-col gap-3 p-3 rounded-xl bg-wp-card border border-wp-border",
                        busy === task.id && "opacity-50",
                      )}
                    >
                      {/* The task first and loudest; when it was due underneath, as context. */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {category && (
                            <CategoryTag category={category} />
                          )}

                          {/* `min-w-0` is what lets a long title truncate rather than widen the
                              card. */}
                          <span className="flex-1 min-w-0 truncate font-medium text-wp-fg">{task.title}</span>
                        </div>

                        <span className="text-xs text-wp-muted">
                          {undated
                            ? t("leftovers.planned_that_week")
                            : t("leftovers.planned_on", { date: leftoverDate(task).format("ddd D MMM") })}
                        </span>
                      </div>

                      {/* On its own line: seven day targets do not fit beside a title, and the
                          rail is the primary action rather than an afterthought at the end. */}
                      <LeftoverActions
                        task={task}
                        busy={busy === task.id}
                        onMoveToDay={(day) => resolve(task, () => relocateTask(task, { weekCode: thisWeek, dayOfWeek: day }))}
                        onMoveToWeek={() => resolve(task, () => rescueTask(task, "thisWeek"))}
                        onSomeday={() => resolve(task, () => rescueTask(task, "someday"))}
                        onDone={() => resolve(task, () => completeTask(task))}
                        onDelete={() => remove(task)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
            </Modal.Body>

            <Modal.Footer>
              {/* In the footer rather than in place of the row: the row is gone, and putting the
                  offer where it used to be would make the list jump under the pointer. */}
              {undoable && (
                <button
                  type="button"
                  onClick={undo}
                  className="mr-auto text-sm underline text-wp-fg-secondary"
                >
                  {t("leftovers.undo_delete", { title: undoable.title })}
                </button>
              )}
              <Button variant="primary" onPress={close}>
                {total === 0 ? t("leftovers.done") : t("leftovers.later")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
          )}
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default LeftoverReview;
