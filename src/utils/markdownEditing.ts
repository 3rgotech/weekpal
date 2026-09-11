/**
 * What the formatting buttons do to the text in the box.
 *
 * Pure, and separate from the renderer: one file turns Markdown into HTML, this one turns a
 * selection into Markdown. Keeping them apart is what lets both be tested without a DOM — the
 * component below them owns a `<textarea>` and nothing else.
 *
 * Every action returns the new value *and the new selection*, because a toolbar that formats the
 * text and then drops the cursor at the end of it is a toolbar people press once.
 */

export type WrapFormat = "bold" | "italic" | "strike" | "code";
export type LineFormat = "bullet" | "ordered" | "quote";
export type MarkdownFormat = WrapFormat | LineFormat | "link";

export interface Selection {
    value: string;
    start: number;
    end: number;
}

const WRAPPERS: Record<WrapFormat, string> = {
    bold: "**",
    italic: "*",
    strike: "~~",
    code: "`",
};

const PREFIXES: Record<LineFormat, (index: number) => string> = {
    bullet: () => "- ",
    // Numbered from one down the selection, so three selected lines become 1., 2., 3. rather
    // than three 1.s that only a renderer would put right.
    ordered: (index) => `${index + 1}. `,
    quote: () => "> ",
};

/** Wrap the selection, or unwrap it when it is already wrapped — the button is a toggle. */
const wrap = ({ value, start, end }: Selection, format: WrapFormat): Selection => {
    const marker = WRAPPERS[format];
    const selected = value.slice(start, end);

    const alreadyInside = value.slice(start - marker.length, start) === marker
        && value.slice(end, end + marker.length) === marker;

    if (alreadyInside) {
        return {
            value: value.slice(0, start - marker.length) + selected + value.slice(end + marker.length),
            start: start - marker.length,
            end: end - marker.length,
        };
    }

    if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
        const inner = selected.slice(marker.length, -marker.length);

        return {
            value: value.slice(0, start) + inner + value.slice(end),
            start,
            end: start + inner.length,
        };
    }

    return {
        value: value.slice(0, start) + marker + selected + marker + value.slice(end),
        // Around the text, not around the markers: the user is still editing the words.
        start: start + marker.length,
        end: end + marker.length,
    };
};

/**
 * Put a marker at the front of every selected line, or take it off every one that has it.
 *
 * The whole selection is grown to whole lines first. Formatting half a line as a list item is not
 * a thing anybody means, and the markers only work at the start of one.
 */
const prefixLines = ({ value, start, end }: Selection, format: LineFormat): Selection => {
    const from = value.lastIndexOf("\n", start - 1) + 1;
    const toNewline = value.indexOf("\n", end);
    const to = toNewline === -1 ? value.length : toNewline;

    const lines = value.slice(from, to).split("\n");
    const existing = /^(\s*)([-*+] |\d+[.)] |> )/;
    const allPrefixed = lines.every((line) => existing.test(line));

    const changed = lines.map((line, index) => (allPrefixed
        ? line.replace(existing, "$1")
        : line.replace(/^(\s*)/, `$1${PREFIXES[format](index)}`)));

    const replacement = changed.join("\n");

    return {
        value: value.slice(0, from) + replacement + value.slice(to),
        start: from,
        end: from + replacement.length,
    };
};

/**
 * A link around the selection, with the cursor left where the URL goes.
 *
 * Nothing is validated here. An empty or broken target is a thing somebody is halfway through
 * typing; the renderer is where a target that would not be safe stops being a link.
 */
const link = ({ value, start, end }: Selection): Selection => {
    const selected = value.slice(start, end) || "";
    const inserted = `[${selected}](url)`;

    return {
        value: value.slice(0, start) + inserted + value.slice(end),
        // Over the placeholder, so typing replaces it.
        start: start + selected.length + 3,
        end: start + selected.length + 6,
    };
};

export function applyMarkdownFormat(selection: Selection, format: MarkdownFormat): Selection {
    if (format === "link") {
        return link(selection);
    }

    if (format in WRAPPERS) {
        return wrap(selection, format as WrapFormat);
    }

    return prefixLines(selection, format as LineFormat);
}

/**
 * The keyboard shortcuts the toolbar mirrors, or null for a keystroke that belongs to the
 * textarea.
 *
 * Only the three people actually reach for. Binding more would start competing with the
 * browser's own and with the board's single-key shortcuts, which stand down inside a field.
 */
export function shortcutFormat(event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
}): MarkdownFormat | null {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return null;
    }

    switch (event.key.toLowerCase()) {
        case "b":
            return "bold";
        case "i":
            return "italic";
        case "k":
            return "link";
        default:
            return null;
    }
}
