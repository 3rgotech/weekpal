import React, { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useSettings } from "../contexts/SettingsContext";
import { columnLimit } from "../utils/capacity";
import { relieveTarget } from "../utils/taskMoves";
import Task from "../data/task";

/**
 * What a hard limit does when a column goes over it.
 *
 * The friction the Some day limit was named for: make room, or let something go. Soft limits —
 * the default — never reach this; they colour the count and leave the rest alone.
 *
 * The task that triggered it is **already saved** before this opens. Refusing a capture is the
 * one thing a board like this must not do: the thought arrives once, often with no network, and
 * a dialog that eats it is worse than a column that is briefly one over.
 *
 * There is no "Not now" button, but Escape and the backdrop still close it — a dialog with no way
 * out is a keyboard trap, and it would be the wrong answer for someone who genuinely does want
 * the column over for an hour. The column stays over and stays red, and the prompt returns on the
 * next capture. That is the whole of the enforcement: insistent, not inescapable.
 */
const LimitReachedModal: React.FC = () => {
    const { t } = useTranslation();
    const {
        allTasks,
        overLimitColumn,
        clearOverLimit,
        relocateTask,
        deleteTask,
        categories,
    } = useData();
    const { currentWeek } = useCalendar();
    const { settings } = useSettings();
    const [busy, setBusy] = useState<string | null>(null);

    const column = overLimitColumn;

    const inColumn = column === null
        ? []
        : allTasks.filter((task) => (
            `${task.dayOfWeek}` === column && !task.completed && !task.belongsToProject
        ));

    const limit = column === null ? 0 : columnLimit(column, settings);

    const label = (task: Task): string => {
        const category = categories.find((held) => held.id === task.categoryId);

        return category ? `${task.title} · ${category.name}` : task.title;
    };

    const relieve = async (task: Task) => {
        setBusy(task.id);
        await relocateTask(task, relieveTarget(task, currentWeek));
        setBusy(null);
        clearOverLimit();
    };

    const drop = async (task: Task) => {
        setBusy(task.id);
        await deleteTask(task);
        setBusy(null);
        clearOverLimit();
    };

    /** Where "make room" sends a task from this column, named so the button is not a mystery. */
    const moveLabel = column === "someday"
        ? t("limits.promote")
        : column === "0"
            ? t("limits.to_someday")
            : t("limits.to_this_week");

    return (
        <Modal isOpen={column !== null} onOpenChange={(open: boolean) => !open && clearOverLimit()}>
            <Modal.Backdrop variant="blur">
                <Modal.Container size="lg" scroll="inside">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("limits.full")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("limits.explain", { planned: inColumn.length, limit })}
                            </p>

                            <ul className="flex flex-col gap-1">
                                {inColumn.map((task) => (
                                    <li
                                        key={task.id}
                                        className={clsx(
                                            "flex items-center gap-2 py-1.5 border-b border-slate-200 dark:border-slate-600",
                                            busy === task.id && "opacity-50",
                                        )}
                                    >
                                        <span className="flex-1 min-w-0 truncate text-sm dark:text-white">
                                            {label(task)}
                                        </span>

                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            isDisabled={busy !== null}
                                            onPress={() => { void relieve(task); }}
                                        >
                                            {moveLabel}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="danger"
                                            isDisabled={busy !== null}
                                            onPress={() => { void drop(task); }}
                                        >
                                            <Trash size={14} />
                                            {t("limits.delete")}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default LimitReachedModal;
