import React, { useEffect, useState } from "react";
import { Button, Modal, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { AvoidanceReport, IInsightsAdapter } from "../types";
import { COLORS } from "../utils/color";

interface AvoidanceReportModalProps {
    adapter: IInsightsAdapter | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * What your history says you have been avoiding.
 *
 * *(rt §2)* The Pro tier's reason to exist. Everything shown is derived from what the account
 * *did* — the deferral counts and the changelog — never from anything its owner declared, which
 * is the same principle that cut the self-reported urgency field.
 *
 * The wording rules are the feature as much as the numbers are:
 *
 * - ***(rt §6)* The mark describes the task, never the person.** "Moved 9 times", never "you
 *   postponed this 9 times". The board has no business making an accusation, and a report that
 *   reads as one gets closed and not reopened.
 * - **No advice.** It says what happened; it does not suggest what to do about it. The user knows
 *   their own life, and "consider breaking this down" from a task manager is impertinent.
 * - **Honest about not knowing.** A young account is told there is not enough history yet rather
 *   than shown a pattern invented from a fortnight — that would spend the tier's credibility on
 *   the first screen anybody sees.
 */
const AvoidanceReportModal: React.FC<AvoidanceReportModalProps> = ({ adapter, isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const [report, setReport] = useState<AvoidanceReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!isOpen || !adapter) {
            return;
        }

        setLoading(true);
        setFailed(false);

        adapter.avoidance()
            .then(setReport)
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [isOpen, adapter]);

    const swatch = (color: string | null) =>
        (color && color in COLORS ? COLORS[color as keyof typeof COLORS].bg : "bg-slate-400");

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="lg" scroll="inside">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("avoidance.title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-6">
                            {loading && <Spinner />}

                            {failed && (
                                <p className="text-sm text-wp-danger">{t("avoidance.error")}</p>
                            )}

                            {!loading && !failed && report === null && (
                                <p className="text-sm text-wp-muted">{t("avoidance.pro_only")}</p>
                            )}

                            {report !== null && !report.has_enough_data && (
                                <p className="text-sm text-wp-muted">
                                    {t("avoidance.too_early")}
                                </p>
                            )}

                            {report !== null && report.has_enough_data && (
                                <>
                                    {/* The one line a weekly email would carry. If this does not
                                        sting, the report does not sting. */}
                                    <p className="text-base text-wp-fg">
                                        {t("avoidance.headline", {
                                            moves: report.moves,
                                            open: report.open,
                                            chronic: report.chronic,
                                        })}
                                    </p>

                                    {report.most_deferred.length > 0 && (
                                        <section className="flex flex-col gap-2">
                                            <h3 className="text-sm font-semibold text-wp-fg">
                                                {t("avoidance.most_deferred")}
                                            </h3>
                                            <ul className="flex flex-col gap-1">
                                                {report.most_deferred.map((row) => (
                                                    <li key={row.id} className="flex items-center gap-2 text-sm">
                                                        <span className={clsx("size-2 rounded-full shrink-0", swatch(row.color))} />
                                                        <span className="flex-1 min-w-0 truncate">{row.title}</span>
                                                        {/* A fact about the card, in the badge's own
                                                            achromatic language. */}
                                                        <span className="shrink-0 tabular-nums text-xs text-wp-muted">
                                                            {t("avoidance.moved", { count: row.moves })}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {report.by_category.length > 0 && (
                                        <section className="flex flex-col gap-2">
                                            <h3 className="text-sm font-semibold text-wp-fg">
                                                {t("avoidance.by_category")}
                                            </h3>
                                            {/* The finding nobody knows about themselves: a board
                                                shows what is there, not what became of it. */}
                                            <ul className="flex flex-col gap-1.5">
                                                {report.by_category.map((row) => (
                                                    <li key={row.category ?? "none"} className="flex items-center gap-2 text-sm">
                                                        <span className={clsx("size-2 rounded-full shrink-0", swatch(row.color))} />
                                                        <span className="flex-1 min-w-0 truncate">
                                                            {row.category ?? t("avoidance.uncategorised")}
                                                        </span>
                                                        <span className="shrink-0 tabular-nums text-xs text-wp-muted">
                                                            {t("avoidance.completion", { percent: row.completion })}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}

                                    {report.longest_chains.length > 0 && (
                                        <section className="flex flex-col gap-2">
                                            <h3 className="text-sm font-semibold text-wp-fg">
                                                {t("avoidance.longest")}
                                            </h3>
                                            <ul className="flex flex-col gap-1">
                                                {report.longest_chains.map((row) => (
                                                    <li key={row.id} className="flex items-center gap-2 text-sm">
                                                        <span className="flex-1 min-w-0 truncate">{row.title}</span>
                                                        <span className="shrink-0 tabular-nums text-xs text-wp-muted">
                                                            {new Date(row.first_seen).toLocaleDateString()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    )}
                                </>
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="primary" onPress={() => onOpenChange(false)}>
                                {t("actions.close")}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default AvoidanceReportModal;
