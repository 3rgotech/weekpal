import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bold, Code, Italic, Link2, List, ListOrdered, Quote, Strikethrough } from "lucide-react";
import { MarkdownFormat, applyMarkdownFormat, shortcutFormat } from "../utils/markdownEditing";
import { DESCRIPTION_LIMIT, renderMarkdown } from "../utils/markdown";

interface DescriptionEditorProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
}

/**
 * A task's description, written in Markdown.
 *
 * **A textarea with a toolbar, not a WYSIWYG surface**, and that was a measurement rather than a
 * preference. The board ships as one UMD bundle that cannot be code-split, and on it TipTap costs
 * **+123 kB gzip (+39%)** and Lexical **+79 kB (+25%)** — for a field most tasks will never use.
 * This is under 2 kB, and the things a `contenteditable` costs you come free: the native undo
 * stack, IME composition, a phone's own keyboard and text selection, and every assistive
 * technology that already knows what a textarea is.
 *
 * What is stored is the Markdown itself, which is what makes this cheap everywhere else too. The
 * column stays a string, so per-field LWW is untouched; every description written before this
 * existed is still valid and still means the same thing; and the export, the CSV import and the
 * printed week all keep working on text nobody has to render.
 *
 * Write and Preview rather than a live split: the dialog is not wide, and a preview that is
 * always there halves the box you are typing into.
 */
const TOOLBAR: Array<{ format: MarkdownFormat; icon: React.ComponentType<{ size?: number | string; className?: string }> }> = [
    { format: "bold", icon: Bold },
    { format: "italic", icon: Italic },
    { format: "strike", icon: Strikethrough },
    { format: "code", icon: Code },
    { format: "link", icon: Link2 },
    { format: "bullet", icon: List },
    { format: "ordered", icon: ListOrdered },
    { format: "quote", icon: Quote },
];

const DescriptionEditor: React.FC<DescriptionEditorProps> = ({
    value,
    onChange,
    label,
    placeholder,
}) => {
    const { t } = useTranslation();
    const [previewing, setPreviewing] = useState(false);
    const textarea = useRef<HTMLTextAreaElement>(null);

    const format = (which: MarkdownFormat) => {
        const field = textarea.current;

        if (!field) {
            return;
        }

        const next = applyMarkdownFormat(
            { value, start: field.selectionStart, end: field.selectionEnd },
            which,
        );

        onChange(next.value);

        /*
         * Put the selection back after React has written the new value.
         *
         * A controlled textarea has its caret reset to the end on every re-render, so setting it
         * synchronously here would be immediately undone — and a toolbar that formats a word and
         * then sends the cursor to the bottom of the box is one people press exactly once.
         */
        requestAnimationFrame(() => {
            field.focus();
            field.setSelectionRange(next.start, next.end);
        });
    };

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-wp-fg-secondary">{label}</span>

                {/* Only once there is something to preview. An empty tab that shows an empty box
                    is a control that teaches people it does nothing. */}
                {value.trim() !== "" && (
                    <button
                        type="button"
                        onClick={() => setPreviewing((on) => !on)}
                        className="text-xs font-medium underline underline-offset-2 text-wp-muted hover:text-wp-fg-secondary cursor-pointer"
                    >
                        {previewing ? t("task.editor.write") : t("task.editor.preview")}
                    </button>
                )}
            </div>

            {previewing ? (
                <div
                    className="markdown-body min-h-24 px-3 py-2.5 text-sm leading-normal text-wp-fg rounded-lg border border-wp-border-strong bg-wp-input overflow-y-auto max-h-64"
                    // Safe by construction rather than by sanitising: `renderMarkdown` escapes
                    // everything the user typed before a single formatting rule runs, so every
                    // tag in here is one it emitted itself.
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
                />
            ) : (
                <>
                    {/* One bordered field, toolbar and text together, as the redesign draws it:
                        the buttons are part of the editor, not a row of controls above it. */}
                    <div className="flex flex-col rounded-lg border border-wp-border-strong bg-wp-input focus-within:border-wp-accent">
                    <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-wp-border">
                        {TOOLBAR.map(({ format: which, icon: Icon }) => (
                            <button
                                key={which}
                                type="button"
                                aria-label={t(`task.editor.${which}`)}
                                title={t(`task.editor.${which}`)}
                                // `onMouseDown` with the default prevented, not `onClick`: a click
                                // blurs the textarea first, and the selection the button is about
                                // to act on is gone by the time the handler runs.
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    format(which);
                                }}
                                className="flex h-7 w-[30px] items-center justify-center rounded-md text-wp-fg-secondary cursor-pointer hover:bg-wp-track hover:text-wp-fg focus-visible:outline-2 focus-visible:outline-wp-accent"
                            >
                                <Icon size={15} />
                            </button>
                        ))}
                    </div>

                    <textarea
                        ref={textarea}
                        rows={5}
                        value={value}
                        maxLength={DESCRIPTION_LIMIT}
                        aria-label={label}
                        placeholder={placeholder}
                        onChange={(event) => onChange(event.target.value)}
                        onKeyDown={(event) => {
                            const which = shortcutFormat(event);

                            if (which === null) {
                                return;
                            }

                            // Before the browser's own ⌘B, which in a textarea does nothing
                            // useful anyway.
                            event.preventDefault();
                            format(which);
                        }}
                        className="w-full px-3 py-2.5 text-sm leading-normal text-wp-fg placeholder:text-wp-muted bg-transparent rounded-b-lg outline-hidden resize-y"
                    />
                    </div>

                    <p className="text-[11px] text-wp-muted">
                        {t("task.editor.hint")}
                    </p>
                </>
            )}
        </div>
    );
};

export default DescriptionEditor;
