import React from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { ChangelogEntry } from "../types";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";

interface ChangelogModalProps {
    isOpen: boolean;
    /** `new` shows only what shipped while the user was away; `all` shows the history. */
    view: "new" | "all" | null;
    entries: ChangelogEntry[];
    /** The list could not be fetched — offline, or a backend with the feature switched off. */
    failed: boolean;
    onClose: () => void;
    onShowEverything: () => void;
}

/**
 * What's new, and what came before it.
 *
 * One dialog with two readings of the same list rather than two components: they differ only in
 * which entries they show and what the heading says, and a separate "full changelog" screen would
 * be a second place to keep the release-note styling correct.
 *
 * The body arrives as HTML, because the entries are written in a rich editor and a release note
 * without a bulleted list is a worse release note. It is reduced to an allowlist of tags on the
 * server before it is sent — see `App\Support\SafeHtml` — which is what makes the
 * `dangerouslySetInnerHTML` below defensible: the sanitising happens where a stale bundle cannot
 * skip it, and the only people who can write an entry are admins.
 */
const ChangelogModal: React.FC<ChangelogModalProps> = ({
    isOpen,
    view,
    entries,
    failed,
    onClose,
    onShowEverything,
}) => {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const dayjs = useDayJs(settings.language);

    const shown = view === "new" ? entries.filter((entry) => !entry.seen) : entries;

    // Only worth offering when there is more behind it. After a first release the "new" list and
    // the whole history are the same three lines.
    const hasOlder = view === "new" && entries.length > shown.length;

    return (
        <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Modal.Backdrop>
                <Modal.Container size="lg">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>
                                {view === "new" ? t("changelog.whats_new") : t("changelog.title")}
                            </Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto">
                            {shown.length === 0 && (
                                <p className="text-sm text-wp-fg-secondary">
                                    {failed ? t("changelog.unavailable") : t("changelog.empty")}
                                </p>
                            )}

                            {shown.map((entry) => (
                                <article key={entry.id} className="flex flex-col gap-2">
                                    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h3 className="text-[15px] font-bold text-wp-fg">{entry.title}</h3>
                                        {/* Empty for everything written before the 1.0.0 tag, and
                                            absent rather than blank when it is: a version badge
                                            with nothing in it reads as a missing value. */}
                                        {entry.version && (
                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-wp-accent-soft text-wp-accent">
                                                v{entry.version}
                                            </span>
                                        )}
                                        {entry.publishedAt && (
                                            <time
                                                dateTime={entry.publishedAt}
                                                className="text-xs text-wp-muted"
                                            >
                                                {dayjs(entry.publishedAt).format("LL")}
                                            </time>
                                        )}
                                    </header>

                                    <p className="text-sm text-wp-fg-secondary">{entry.description}</p>

                                    <div
                                        className="changelog-body text-sm text-wp-fg-secondary"
                                        // Sanitised server-side, by `SafeHtml::forBoard`.
                                        dangerouslySetInnerHTML={{ __html: entry.body }}
                                    />
                                </article>
                            ))}
                        </Modal.Body>

                        <Modal.Footer>
                            {hasOlder && (
                                <Button variant="secondary" onPress={onShowEverything}>
                                    {t("changelog.see_all")}
                                </Button>
                            )}
                            <Button variant="primary" onPress={onClose}>
                                {t("actions.close")}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default ChangelogModal;
