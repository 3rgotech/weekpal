import React from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useTaskModal } from "../contexts/TaskModalContext";

interface EscapeHatchModalProps {
    task: Task | null;
    onClose: () => void;
}

/**
 * Three doors, for a task that has been carried too long.
 *
 * *(rt §6)* **Escalation without an exit is nagging with better typography.** The count is only
 * the trigger; this is the feature. Giving somebody permission to drop a task without it feeling
 * like defeat is the actual thing being offered, and it is why the third door is worded as
 * *let it go* rather than *delete*.
 *
 * The three are not variations on deleting. They are the three honest reasons a task keeps not
 * getting done, and naming them is most of the help:
 *
 * - **Break it down** — it is too big to start. Opens the editor at its subtasks.
 * - **It's not mine** — it belongs to someone else, or to nobody. It goes, and says so.
 * - **Let it go** — it was a good idea and it is not going to happen. It goes, and says so.
 *
 * The last two both end in a delete, and the difference between them is recorded rather than
 * cosmetic: "I let go of nine things this month" is a finding the Avoidance Report can use, where
 * nine anonymous deletions is housekeeping.
 *
 * No fourth door for "keep it". Closing the dialog is that, and offering it as a button would
 * make deferring again feel like the sanctioned answer — which is the one thing this exists to
 * interrupt.
 */
const EscapeHatchModal: React.FC<EscapeHatchModalProps> = ({ task, onClose }) => {
    const { t } = useTranslation();
    const { deleteTask } = useData();
    const { open: openTask } = useTaskModal();

    if (task === null) {
        return null;
    }

    const drop = (reason: "not_mine" | "let_go") => {
        deleteTask(task, reason);
        onClose();
    };

    return (
        <Modal isOpen onOpenChange={(open: boolean) => { if (!open) { onClose(); } }}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("deferral.escape_title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body>
                            {/* Names the task, and states the count as a fact about it. Never a
                                second-person verb — the mark describes the task, not the person. */}
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("deferral.escape_intro", {
                                    title: task.title,
                                    count: task.deferralCount,
                                })}
                            </p>

                            <div className="flex flex-col gap-2 pt-4">
                                <Button
                                    variant="secondary"
                                    onPress={() => {
                                        openTask(task);
                                        onClose();
                                    }}
                                >
                                    {t("deferral.break_down")}
                                </Button>

                                <Button variant="secondary" onPress={() => drop("not_mine")}>
                                    {t("deferral.not_mine")}
                                </Button>

                                <Button variant="secondary" onPress={() => drop("let_go")}>
                                    {t("deferral.let_go")}
                                </Button>
                            </div>
                        </Modal.Body>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default EscapeHatchModal;
