import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { RescueDestination, useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { weekHeaderLabel } from "../utils/settings";
import { WeeklyTask } from "../data/task";
import IconButton from "./IconButton";

/** The week whose review has already been seen. Per browser: nagging is a per-device concern. */
const REVIEWED_KEY = "leftover-review-week";

/** How long a loaded list is trusted before a manual reopen fetches it again. */
const STALE_AFTER = 5 * 60 * 1000;

interface LeftoverReviewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The weekly look back at what never got done.
 *
 * Opens by itself once a week, and only when there is something in it — a modal that greets an
 * empty list is a modal that teaches people to dismiss it unread. Every row offers the four
 * ways a leftover ends: it was done and never ticked, it stopped mattering, it belongs in this
 * week, or it belongs to no week at all.
 *
 * Acting on a row removes it from the list rather than re-fetching. The write is queued through
 * the same store the board uses, so this works offline exactly as the board does, and a task
 * resolved here is resolved everywhere.
 */
const LeftoverReview: React.FC<LeftoverReviewProps> = ({ isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const dayjs = useDayJs(settings.language);
  const { taskStore, categories, completeTask, deleteTask, rescueTask } = useData();

  const [tasks, setTasks] = useState<WeeklyTask[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const loadedAt = useRef(0);

  const thisWeek = dayjs().format("GGGG[w]WW");

  const load = useCallback(async (): Promise<WeeklyTask[]> => {
    if (!taskStore) {
      return [];
    }

    setLoading(true);

    try {
      const found = await taskStore.leftovers();
      setTasks(found);
      loadedAt.current = Date.now();

      return found;
    } finally {
      setLoading(false);
    }
  }, [taskStore]);

  // Once per week, and never on an empty list. `onOpenChange` is deliberately absent from the
  // dependencies: it is the setter of the caller's state, and re-running this on every render
  // of the parent would reopen a modal the user has just closed.
  //
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let seen: string | null = null;

      try {
        seen = localStorage.getItem(REVIEWED_KEY);
      } catch {
        // A browser with storage blocked reviews every load rather than never.
      }

      if (seen === thisWeek) {
        return;
      }

      const found = await load();

      if (!cancelled && found.length > 0) {
        onOpenChange(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load, thisWeek]);

  // A board left open for days would otherwise reopen showing the list it built on Monday.
  useEffect(() => {
    if (isOpen && (tasks === null || Date.now() - loadedAt.current > STALE_AFTER)) {
      load();
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
  };

  /** Every action resolves the task, so it leaves the review either way. */
  const resolve = async (task: WeeklyTask, action: () => void | Promise<void>) => {
    setBusy(task.id);

    try {
      await action();
      setTasks((previous) => (previous ?? []).filter((leftover) => leftover.id !== task.id));
    } finally {
      setBusy(null);
    }
  };

  const rescue = (task: WeeklyTask, destination: RescueDestination) =>
    resolve(task, () => rescueTask(task, destination));

  // Grouped by the week they were left in, which the sort already puts in order.
  const weeks = useMemo(() => {
    const grouped = new Map<string, WeeklyTask[]>();

    (tasks ?? []).forEach((task) => {
      grouped.set(task.weekCode, [...(grouped.get(task.weekCode) ?? []), task]);
    });

    return [...grouped.entries()];
  }, [tasks]);

  const total = tasks?.length ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={close} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 dark:text-white">
          {t("leftovers.title")}
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            {loading && tasks === null ? t("leftovers.loading") : t("leftovers.summary", { count: total })}
          </span>
        </ModalHeader>

        <ModalBody className="dark:text-white">
          {loading && tasks === null && (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          )}

          {tasks !== null && total === 0 && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("leftovers.empty")}
            </p>
          )}

          {total > 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("leftovers.intro")}</p>
          )}

          {weeks.map(([weekCode, weekTasks]) => (
            <section key={weekCode} className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {weekHeaderLabel(
                  dayjs(weekCode, "GGGG[w]WW").startOf("isoWeek").format(settings.weekHeaderFormat),
                  { week: t("misc.week"), of: t("misc.of") },
                )}
              </h3>

              <ul className="flex flex-col">
                {weekTasks.map((task) => {
                  const category = categories.find((c) => c.id === task.categoryId);
                  // The undated bucket has no weekday to keep, so "same day" would be the very
                  // same move as "this week" — the button is left out rather than duplicated.
                  const undated = `${task.dayOfWeek}` === "0";

                  return (
                    <li
                      key={task.id}
                      className={clsx(
                        "flex flex-wrap items-center gap-2 py-2 border-b border-slate-200 dark:border-slate-600",
                        busy === task.id && "opacity-50",
                      )}
                    >
                      <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {undated ? t("main.this_week") : task.date?.format("ddd D MMM")}
                      </span>

                      {category && (
                        <Chip size="sm" className={clsx("text-xs rounded-md text-white", category.getColorClass("bg"))}>
                          {category.name}
                        </Chip>
                      )}

                      <span className="flex-1 min-w-32 truncate">{task.title}</span>

                      <div className="flex items-center gap-1">
                        <IconButton
                          icon="check"
                          size="sm"
                          tooltip={t("leftovers.complete")}
                          onClick={() => resolve(task, () => completeTask(task))}
                        />
                        <IconButton
                          icon="trash"
                          size="sm"
                          tooltip={t("leftovers.delete")}
                          onClick={() => resolve(task, () => deleteTask(task))}
                        />

                        {!undated && (
                          <Button size="sm" variant="flat" onPress={() => rescue(task, "sameDay")}>
                            {t("leftovers.same_day")}
                          </Button>
                        )}
                        <Button size="sm" variant="flat" onPress={() => rescue(task, "thisWeek")}>
                          {t("leftovers.this_week")}
                        </Button>
                        <Button size="sm" variant="flat" onPress={() => rescue(task, "someday")}>
                          {t("leftovers.some_day")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </ModalBody>

        <ModalFooter>
          <Button color="primary" onPress={close}>
            {total === 0 ? t("leftovers.done") : t("leftovers.later")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default LeftoverReview;
