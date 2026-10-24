import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { IFeedbackAdapter } from "../types";
import { Diagnostics, collectDiagnostics } from "../utils/diagnostics";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";

interface FeedbackModalProps {
    adapter: IFeedbackAdapter | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * "Something's broken" / "this could be better", from inside the board.
 *
 * A beta mechanism. Five friends and relatives will hit things, and the value of what they hit
 * decays fast — somebody who meets a bug on Tuesday has worked around it by Thursday and no
 * longer remembers the details. So the report has to be reachable in one click from wherever
 * they are, and take one sentence.
 *
 * **The diagnostics are shown before they are sent.** Attaching the board's own state without
 * saying so would be collecting device information from somebody who came here to be helpful.
 * They are folded away rather than hidden — visible to anybody who looks, in the way that
 * "attached: 12 details" is and a silent payload is not.
 *
 * Deliberately not queued offline, unlike every other write on this board: a report is not the
 * user's data, and one silently waiting in a queue is worse than one that failed loudly, because
 * the user would believe they had told somebody.
 */
const FeedbackModal: React.FC<FeedbackModalProps> = ({ adapter, isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const { taskStore } = useData();
    const { currentWeek } = useCalendar();

    const [kind, setKind] = useState<"bug" | "idea">("bug");
    const [message, setMessage] = useState("");
    const [diagnostics, setDiagnostics] = useState<Diagnostics>({});
    const [showDetails, setShowDetails] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [failed, setFailed] = useState(false);

    /*
     * Collected when the dialog opens, not when Send is pressed.
     *
     * The state worth reporting is the state the board was in when the user decided something
     * was wrong — by the time they have typed a sentence, a queue may have drained and taken the
     * evidence with it.
     */
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setSent(false);
        setFailed(false);

        void collectDiagnostics(
            () => taskStore?.getPendingChangesCount() ?? Promise.resolve(0),
            () => taskStore?.getDeadLetters() ?? Promise.resolve([]),
        ).then(setDiagnostics);
    }, [isOpen, taskStore]);

    if (!adapter) {
        return null;
    }

    const send = async () => {
        if (message.trim().length < 3) {
            return;
        }

        setBusy(true);
        setFailed(false);

        try {
            await adapter.send(kind, message.trim(), diagnostics, currentWeek);
            setSent(true);
            setMessage("");
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("feedback.title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-4">
                            {sent ? (
                                <p className="text-sm text-wp-fg-secondary">{t("feedback.thanks")}</p>
                            ) : (
                                <>
                                    {/* Two, not five. A taxonomy is a decision asked of somebody
                                        who came here to say one thing. */}
                                    <div className="flex gap-2">
                                        {(["bug", "idea"] as const).map((option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                aria-pressed={kind === option}
                                                onClick={() => setKind(option)}
                                                className={clsx(
                                                    "flex-1 px-3 py-2 rounded-md text-sm font-medium",
                                                    "focus-visible:outline-2 focus-visible:outline-wp-accent",
                                                    kind === option
                                                        ? "bg-wp-accent text-wp-on-accent"
                                                        : "bg-wp-track text-wp-fg-secondary hover:text-wp-fg",
                                                )}
                                            >
                                                {t(`feedback.kind_${option}`)}
                                            </button>
                                        ))}
                                    </div>

                                    <MessageField
                                        value={message}
                                        onChange={setMessage}
                                        label={t("feedback.title")}
                                        placeholder={t(`feedback.placeholder_${kind}`)}
                                    />

                                    {/* Shown, not hidden. Attaching the board's own state without
                                        saying so would be collecting device information from
                                        somebody who came here to be helpful. */}
                                    <div className="text-xs text-wp-muted">
                                        <button
                                            type="button"
                                            onClick={() => setShowDetails((open) => !open)}
                                            className="underline"
                                        >
                                            {t("feedback.attached", { count: Object.keys(diagnostics).length })}
                                        </button>

                                        {showDetails && (
                                            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
                                                {Object.entries(diagnostics).map(([key, value]) => (
                                                    <React.Fragment key={key}>
                                                        <dt className="text-wp-muted">{key}</dt>
                                                        <dd className="truncate">{value}</dd>
                                                    </React.Fragment>
                                                ))}
                                            </dl>
                                        )}

                                        <p className="mt-2">{t("feedback.no_tasks")}</p>
                                    </div>

                                    {failed && (
                                        <p className="text-sm text-wp-danger">{t("feedback.error")}</p>
                                    )}
                                </>
                            )}
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="secondary" onPress={() => onOpenChange(false)}>
                                {sent ? t("actions.close") : t("actions.cancel")}
                            </Button>
                            {!sent && (
                                <Button
                                    variant="primary"
                                    isDisabled={busy || message.trim().length < 3}
                                    onPress={send}
                                >
                                    {t("feedback.send")}
                                </Button>
                            )}
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

interface MessageFieldProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder: string;
}

/**
 * Where the report is written: an editable box, not a `<textarea>`.
 *
 * iOS Safari took the textarea for a street address — a multi-line field is what an address
 * form uses — offered contact AutoFill over the keyboard and switched autocorrection off, with
 * `autocomplete="off"` ignored. AutoFill only ever looks at form controls, so a plain-text
 * `contenteditable` is left alone and gets the keyboard's ordinary corrections.
 *
 * Uncontrolled in the DOM, because rewriting an editable element's text on every keystroke moves
 * the caret to the start; the text is only written in when the box mounts, so a report reopened
 * unsent keeps what had been typed.
 *
 * Focused straight away only with a mouse. On a phone the keyboard rising on open pushed the
 * dialog out of view before anyone had chosen a kind.
 */
const MessageField: React.FC<MessageFieldProps> = ({ value, onChange, label, placeholder }) => {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const box = ref.current;

        if (!box) {
            return;
        }

        box.textContent = value;

        if (prefersAutoFocus()) {
            box.focus();
        }
        // Mount only: see above.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="relative">
            <div
                ref={ref}
                role="textbox"
                aria-multiline="true"
                aria-label={label}
                aria-placeholder={placeholder}
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck
                onInput={(event) => onChange(event.currentTarget.innerText ?? event.currentTarget.textContent ?? "")}
                className={clsx(
                    "w-full min-h-[7.5rem] px-2 py-1.5 text-sm rounded-md border border-wp-border-strong bg-wp-input",
                    "whitespace-pre-wrap break-words outline-hidden focus-visible:border-wp-accent",
                )}
            />
            {/* Drawn from the value rather than with `:empty`: Safari leaves a stray line break in
                a box that has been typed in and cleared, and the box is then never empty again. */}
            {value.trim() === "" && (
                <span aria-hidden="true" className="pointer-events-none absolute left-2 top-1.5 text-sm text-wp-muted">
                    {placeholder}
                </span>
            )}
        </div>
    );
};

/** A mouse or trackpad, where focusing a field costs nothing. A touch screen opens a keyboard. */
function prefersAutoFocus(): boolean {
    return typeof window.matchMedia !== "function" || window.matchMedia("(pointer: fine)").matches;
}

export default FeedbackModal;
