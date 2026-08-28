import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "@heroui/react";
import { ChevronDown } from "lucide-react";
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

/** How long the loaded list is trusted before reopening the review goes and looks again. */
const STALE_AFTER = 5 * 60 * 1000;

const MOVE_LABELS: Record<RescueDestination, string> = {
  sameDay: "leftovers.same_day",
  thisWeek: "leftovers.this_week",
  someday: "leftovers.some_day",
};

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
 * The three moves sit behind one dropdown rather than three buttons. Spelled out, the row ran to
 * five controls and wrapped onto a second line at the widths this modal actually gets, which put
 * the same task's actions in two places depending on how long its title was.
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
  } = useData();

  const [busy, setBusy] = useState<string | null>(null);
  const refreshedAt = useRef(Date.now());

  const thisWeek = dayjs().format("GGGG[w]WW");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!leftoversLoaded || leftovers.length === 0 || reviewed() === thisWeek) {
      return;
    }

    onOpenChange(true);
  }, [leftoversLoaded, leftovers.length, thisWeek]);

  // A board left open for days would otherwise reopen showing the list it built on Monday.
  useEffect(() => {
    if (isOpen && Date.now() - refreshedAt.current > STALE_AFTER) {
      refreshedAt.current = Date.now();
      refreshLeftovers();
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

  return (
    <Modal isOpen={isOpen} onClose={close} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 dark:text-white">
          {t("leftovers.title")}
          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
            {leftoversLoaded ? t("leftovers.summary", { count: total }) : t("leftovers.loading")}
          </span>
        </ModalHeader>

        <ModalBody className="dark:text-white">
          {!leftoversLoaded && (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          )}

          {leftoversLoaded && total === 0 && (
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
                  // same move as "this week" — it is left out rather than duplicated.
                  const undated = `${task.dayOfWeek}` === "0";

                  return (
                    <li
                      key={task.id}
                      className={clsx(
                        "flex items-center gap-2 py-2 border-b border-slate-200 dark:border-slate-600",
                        busy === task.id && "opacity-50",
                      )}
                    >
                      <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {undated ? t("main.this_week") : task.date?.format("ddd D MMM")}
                      </span>

                      {category && (
                        <Chip size="sm" className={clsx("shrink-0 text-xs rounded-md text-white", category.getColorClass("bg"))}>
                          {category.name}
                        </Chip>
                      )}

                      {/* `min-w-0` is what lets a long title truncate instead of pushing the
                          actions onto a line of their own. */}
                      <span className="flex-1 min-w-0 truncate">{task.title}</span>

                      <div className="flex items-center gap-1 shrink-0">
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

                        <Dropdown>
                          <DropdownTrigger>
                            <Button size="sm" variant="flat" endContent={<ChevronDown size={14} />}>
                              {t("leftovers.move")}
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label={t("leftovers.move")}>
                            {([
                              ...(undated ? [] : ["sameDay" as const]),
                              "thisWeek" as const,
                              "someday" as const,
                            ]).map((destination: RescueDestination) => (
                              <DropdownItem
                                key={destination}
                                className="dark:text-white"
                                onPress={() => resolve(task, () => rescueTask(task, destination))}
                              >
                                {t(MOVE_LABELS[destination])}
                              </DropdownItem>
                            ))}
                          </DropdownMenu>
                        </Dropdown>
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
