import React, { useEffect, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { WeekShare } from "../types";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";

interface ShareWeekModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Offered as durations rather than dates: nobody thinks "the 22nd", they think "a week". */
const EXPIRY_CHOICES = [
    { key: "never", days: null },
    { key: "day", days: 1 },
    { key: "week", days: 7 },
    { key: "month", days: 30 },
] as const;

/**
 * Handing one week to somebody who does not have an account.
 *
 * *(rt §16)* This is the distribution channel rather than a feature: at €2 with no salesforce the
 * product spreads through its users or not at all, and a shared week demonstrates it to someone
 * who did not ask, carrying a colleague's credibility.
 *
 * Which is why the defaults are the way they are. **No password, no expiry, no view cap** — the
 * common case is "here is my week" sent to one person, and a dialog that demanded three
 * decisions before producing a link is a dialog people close. The three controls are there,
 * below the link, for the share that needs them.
 */
const ShareWeekModal: React.FC<ShareWeekModalProps> = ({ isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const { currentWeek } = useCalendar();
    const { shareAdapter, categories } = useData();

    const [share, setShare] = useState<WeekShare | null>(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);

    const [password, setPassword] = useState("");
    const [expiry, setExpiry] = useState<string>("never");
    const [maxViews, setMaxViews] = useState<string>("");

    const privateCount = categories.filter((category) => category.isPrivate).length;

    // Only the live link for *this* week. A share for another week is not this dialog's business,
    // and showing one here would make "turn the link off" ambiguous about which link.
    useEffect(() => {
        if (!isOpen || !shareAdapter) {
            return;
        }

        setFailed(false);
        setCopied(false);

        shareAdapter.list()
            .then((shares) => {
                setShare(shares.find((row) => row.week_number === currentWeek && row.is_viewable) ?? null);
            })
            .catch(() => setFailed(true));
    }, [isOpen, shareAdapter, currentWeek]);

    if (!shareAdapter) {
        return null;
    }

    const createLink = async () => {
        setBusy(true);
        setFailed(false);
        setCopied(false);

        const days = EXPIRY_CHOICES.find((choice) => choice.key === expiry)?.days ?? null;

        try {
            setShare(await shareAdapter.share(currentWeek, {
                password: password.trim() === "" ? undefined : password.trim(),
                expiresAt: days === null
                    ? undefined
                    : new Date(Date.now() + days * 86_400_000).toISOString(),
                maxViews: maxViews.trim() === "" ? undefined : Number(maxViews),
            }));
            setPassword("");
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    const revokeLink = async () => {
        setBusy(true);
        setFailed(false);

        try {
            await shareAdapter.revoke(currentWeek);
            setShare(null);
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    const copyLink = async () => {
        if (!share) {
            return;
        }

        try {
            await navigator.clipboard.writeText(share.url);
            setCopied(true);
        } catch {
            // Clipboard access refused, or an insecure origin. The URL is in a readable field
            // right next to the button, so there is nothing to recover from — selecting it by
            // hand still works.
        }
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("share.title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("share.intro")}
                            </p>

                            {privateCount > 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 pt-1">
                                    {t("share.private_note", { count: privateCount })}
                                </p>
                            )}

                            {share && (
                                <div className="flex flex-col gap-2 pt-4" data-testid="share-live">
                                    <div className="flex gap-2">
                                        {/* Readable and selectable rather than a "copy" button alone:
                                            clipboard access can be refused, and a link nobody can
                                            select is a link nobody can send. */}
                                        <input
                                            readOnly
                                            value={share.url}
                                            aria-label={t("share.title")}
                                            onFocus={(event) => event.currentTarget.select()}
                                            className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-md border border-slate-300 dark:border-sky-900 bg-slate-50 dark:bg-sky-950"
                                        />
                                        <Button size="sm" variant="primary" onPress={copyLink}>
                                            {copied ? t("share.copied") : t("share.copy")}
                                        </Button>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {share.view_count > 0
                                            ? t("share.views", { count: share.view_count })
                                            : t("share.no_views")}
                                        {share.has_password && ` · ${t("share.protected")}`}
                                    </p>

                                    <div className="flex gap-2 pt-1">
                                        <Button size="sm" variant="secondary" isDisabled={busy} onPress={revokeLink}>
                                            {t("share.revoke")}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-4">
                                <label className="flex flex-col gap-1 text-sm">
                                    {t("share.password_label")}
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="px-2 py-1.5 rounded-md border border-slate-300 dark:border-sky-900 bg-white dark:bg-sky-950"
                                    />
                                </label>

                                <label className="flex flex-col gap-1 text-sm">
                                    {t("share.expiry_label")}
                                    <select
                                        value={expiry}
                                        onChange={(event) => setExpiry(event.target.value)}
                                        className="px-2 py-1.5 rounded-md border border-slate-300 dark:border-sky-900 bg-white dark:bg-sky-950"
                                    >
                                        {EXPIRY_CHOICES.map((choice) => (
                                            <option key={choice.key} value={choice.key}>
                                                {t(`share.expiry_${choice.key}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-1 text-sm">
                                    {t("share.max_views_label")}
                                    <input
                                        type="number"
                                        min={1}
                                        max={1000}
                                        placeholder={t("share.max_views_any")}
                                        value={maxViews}
                                        onChange={(event) => setMaxViews(event.target.value)}
                                        className="px-2 py-1.5 rounded-md border border-slate-300 dark:border-sky-900 bg-white dark:bg-sky-950"
                                    />
                                </label>

                                {share && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {t("share.replace_warning")}
                                    </p>
                                )}
                            </div>

                            {failed && (
                                <p className="text-sm text-red-600 dark:text-red-400 pt-3">{t("share.error")}</p>
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="secondary" onPress={() => onOpenChange(false)}>
                                {t("actions.cancel")}
                            </Button>
                            <Button variant="primary" isDisabled={busy} onPress={createLink}>
                                {share ? t("share.recreate") : t("share.create")}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default ShareWeekModal;
