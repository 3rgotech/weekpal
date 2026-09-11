/**
 * Task descriptions, written as Markdown and rendered as HTML.
 *
 * **Escaping happens first, and that is the whole security argument.** Every `&`, `<`, `>` and
 * `"` in what the user typed is replaced before a single rule runs, so by the time the formatting
 * passes execute there is no markup left in the text — every angle bracket in the output is one
 * this file put there. That makes the result safe *by construction* rather than by a sanitiser
 * catching up with it afterwards, which matters here in a way it does not for the changelog:
 * a changelog entry is written by an admin, and a task description is written by anybody.
 *
 * The one hole escaping does not close is a link target, because `javascript:alert(1)` contains
 * nothing worth escaping. {@link safeHref} handles that separately.
 *
 * Deliberately small. Bold, italic, strikethrough, code, headings, lists, quotes, rules and
 * links — no tables, no images, no nested lists, no raw HTML. A task description is a note to
 * yourself about a thing you have to do.
 *
 * Hand-written rather than taken from a library, and measured rather than assumed: the whole
 * board is one UMD bundle that cannot be code-split, and on it TipTap costs **+123 kB gzip**,
 * Lexical **+79 kB**, and `marked` **+13 kB** — and `marked` would still need a sanitiser beside
 * it, because it passes raw HTML straight through.
 */

/**
 * How long a description may be, in characters.
 *
 * Must match `App\Models\Task::DESCRIPTION_LIMIT`. Enforced on the field itself rather than left
 * to the API, and that is the point: a write leaves this board through the offline queue, so a
 * 422 for an over-long description would land in a dead letter rather than in front of the person
 * who typed it. The server's rule is the backstop for a client that is not this one.
 */
export const DESCRIPTION_LIMIT = 20000;

/** Nothing downstream can produce a tag, because nothing downstream sees an angle bracket. */
const escapeHtml = (text: string): string => text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * A link target, or null for one that should be rendered as text.
 *
 * Schemes are checked against the URL with its whitespace and control characters removed:
 * browsers strip those before resolving, so a tab inside `java<TAB>script:` is a working payload
 * against a naive `startsWith` test and an inert string against this one.
 *
 * Relative links are refused too, unlike the changelog's. A task description has no business
 * pointing inside the application, and `/` is one character away from `//evil.test`, which is a
 * protocol-relative absolute URL wearing a relative one's clothes.
 */
export const safeHref = (url: string): string | null => {
    const cleaned = url.replace(/[\s\u0000-\u001f\u007f]/g, "");

    return /^(https?:\/\/|mailto:)/i.test(cleaned) ? cleaned : null;
};

/**
 * Marks a code span's place while the other inline rules run over the text around it.
 *
 * A NUL, which cannot appear in the escaped text: anything the user typed that could be mistaken
 * for one of these markers would have to survive `escapeHtml`, and a control character does not
 * survive being typed into a textarea in the first place.
 */
const MARK = "\u0000";

/**
 * The inline rules, applied to already-escaped text.
 *
 * Code spans come out first and go back last: their contents are literal, so `` `**not bold**` ``
 * has to survive a pass that would otherwise emphasise it.
 */
const inline = (text: string): string => {
    const codeSpans: string[] = [];

    let html = text.replace(/`([^`]+)`/g, (_match, code: string) => {
        codeSpans.push(`<code>${code}</code>`);

        return `${MARK}${codeSpans.length - 1}${MARK}`;
    });

    html = html
        // Links before autolinking, so the URL inside `[text](url)` is not linked twice.
        // One level of balanced parentheses inside the target, so `alert(1)` is captured whole
        // rather than leaving a stray `)` behind — and so a Wikipedia URL survives being pasted.
        .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_match, label: string, url: string) => {
            const href = safeHref(url);

            // A refused target keeps its words. Dropping the line entirely would lose what the
            // user wrote in order to protect them from a link they typed themselves.
            return href === null
                ? label
                : `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        })
        // A bare URL somebody pasted. Only http(s) — a bare `mailto:` is rare enough that
        // catching it would cost more false positives than it is worth.
        .replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g, (_match, before: string, url: string) => {
            const href = safeHref(url);

            return href === null
                ? `${before}${url}`
                : `${before}<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        })
        // Strong before emphasis, or `**bold**` is read as an empty italic wrapping an italic.
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
        // `_` only at a word boundary: snake_case_identifiers are common in a task about code,
        // and emphasising their middles would be actively wrong.
        .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,;:!?)])/g, "$1<em>$2</em>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>");

    return html.replace(
        new RegExp(`${MARK}(\\d+)${MARK}`, "g"),
        (_match, index: string) => codeSpans[Number(index)] ?? "",
    );
};

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*+]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
/*
 * Written against the *escaped* text, which is the one surprise of escaping first: by the time
 * the block rules run, a quote marker is `&gt;` rather than `>`. The other markers survive
 * escaping untouched, which is why only this one looks odd.
 */
const QUOTE = /^&gt;\s?(.*)$/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

/**
 * Markdown to HTML.
 *
 * Single newlines become `<br>` rather than being folded into the paragraph. That is not what
 * CommonMark says, and it is what somebody typing a list of three things into a box expects —
 * the ambiguity CommonMark resolves the other way exists because it was written for documents.
 */
export function renderMarkdown(source: string | null | undefined): string {
    if (!source) {
        return "";
    }

    const lines = escapeHtml(source.replace(/\r\n?/g, "\n")).split("\n");
    const html: string[] = [];

    let index = 0;

    while (index < lines.length) {
        const line = lines[index];

        if (line.trim() === "") {
            index++;

            continue;
        }

        // A fenced block is literal all the way down, including any markdown inside it.
        if (/^```/.test(line.trim())) {
            const code: string[] = [];
            index++;

            while (index < lines.length && !/^```/.test(lines[index].trim())) {
                code.push(lines[index]);
                index++;
            }

            // Past the closing fence, or past the end when there never was one — an unterminated
            // fence renders as code rather than swallowing the rest of the description.
            index++;
            html.push(`<pre><code>${code.join("\n")}</code></pre>`);

            continue;
        }

        if (RULE.test(line.trim())) {
            html.push("<hr>");
            index++;

            continue;
        }

        const heading = HEADING.exec(line);

        if (heading) {
            // `h3` upwards, never `h1`: this is a field inside a dialog that has its own heading,
            // and a description cannot outrank the task it belongs to.
            const level = heading[1].length + 2;
            html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            index++;

            continue;
        }

        const quoted: string[] = [];

        while (index < lines.length && QUOTE.test(lines[index])) {
            quoted.push(QUOTE.exec(lines[index])![1]);
            index++;
        }

        if (quoted.length > 0) {
            html.push(`<blockquote>${inline(quoted.join("<br>"))}</blockquote>`);

            continue;
        }

        const listTag = BULLET.test(line) ? "ul" : ORDERED.test(line) ? "ol" : null;

        if (listTag !== null) {
            const pattern = listTag === "ul" ? BULLET : ORDERED;
            const items: string[] = [];

            while (index < lines.length && pattern.test(lines[index])) {
                items.push(`<li>${inline(pattern.exec(lines[index])![1])}</li>`);
                index++;
            }

            html.push(`<${listTag}>${items.join("")}</${listTag}>`);

            continue;
        }

        // Everything else is a paragraph, running until a blank line or a block that is not one.
        const paragraph: string[] = [];

        while (
            index < lines.length
            && lines[index].trim() !== ""
            && !HEADING.test(lines[index])
            && !BULLET.test(lines[index])
            && !ORDERED.test(lines[index])
            && !QUOTE.test(lines[index])
            && !RULE.test(lines[index].trim())
            && !/^```/.test(lines[index].trim())
        ) {
            paragraph.push(lines[index]);
            index++;
        }

        html.push(`<p>${inline(paragraph.join("<br>"))}</p>`);
    }

    return html.join("");
}

/** Whether a description would render as anything at all. */
export const hasMarkdownContent = (source: string | null | undefined): boolean =>
    (source ?? "").trim().length > 0;
