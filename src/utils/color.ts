import type React from "react";

/*
 * Two backgrounds per colour, not one.
 *
 * A completed task's chip is faded, which used to be `bg-opacity-60` alongside whichever `bg-*`
 * the category resolved to. Tailwind 4 removed the opacity utilities in favour of a `/60` on the
 * colour itself — and since the colour is chosen at runtime there is no class to modify, only one
 * to pick. Fading the whole chip with `opacity-60` would be a line shorter and would take the
 * white label down with it.
 */
/*
 * The sixteen hues, drawn in OKLCH at one shared lightness (yellow and lime sit higher, the only
 * place those hues look like themselves) and nudged apart where neighbours ran together. They
 * replaced Tailwind's raw 500s, whose red and rose, violet and purple, emerald and teal were
 * near twins, and whose yellow tag text could not be read on a light card. The names are kept:
 * they are what the server stores.
 *
 * Exact values rather than Tailwind's named shades, written out in full so the classes are
 * generated. Mirrored in `CategoryPalette.php` on the server.
 */
/*
 * `hex` is the same colour as `bg`, as a value rather than a class: the redesign's soft chips
 * and event rows are *derived* from the hue (`.wp-tag`, `.wp-event` in index.css), and a colour
 * chosen at runtime can only reach a `color-mix()` through a custom property.
 */
export const COLORS = {
    "red": { hex: "#e6443d", bg: "bg-[#e6443d]", bgFaded: "bg-[#e6443d]/60", text: "text-[#e6443d]", border: "border-[#e6443d]" },
    "orange": { hex: "#ea7719", bg: "bg-[#ea7719]", bgFaded: "bg-[#ea7719]/60", text: "text-[#ea7719]", border: "border-[#ea7719]" },
    "yellow": { hex: "#ebb00f", bg: "bg-[#ebb00f]", bgFaded: "bg-[#ebb00f]/60", text: "text-[#ebb00f]", border: "border-[#ebb00f]" },
    "lime": { hex: "#93bc2d", bg: "bg-[#93bc2d]", bgFaded: "bg-[#93bc2d]/60", text: "text-[#93bc2d]", border: "border-[#93bc2d]" },
    "green": { hex: "#36a949", bg: "bg-[#36a949]", bgFaded: "bg-[#36a949]/60", text: "text-[#36a949]", border: "border-[#36a949]" },
    "emerald": { hex: "#0d936d", bg: "bg-[#0d936d]", bgFaded: "bg-[#0d936d]/60", text: "text-[#0d936d]", border: "border-[#0d936d]" },
    "teal": { hex: "#25aea7", bg: "bg-[#25aea7]", bgFaded: "bg-[#25aea7]/60", text: "text-[#25aea7]", border: "border-[#25aea7]" },
    "cyan": { hex: "#0893aa", bg: "bg-[#0893aa]", bgFaded: "bg-[#0893aa]/60", text: "text-[#0893aa]", border: "border-[#0893aa]" },
    "sky": { hex: "#3ba6e2", bg: "bg-[#3ba6e2]", bgFaded: "bg-[#3ba6e2]/60", text: "text-[#3ba6e2]", border: "border-[#3ba6e2]" },
    "blue": { hex: "#3375e3", bg: "bg-[#3375e3]", bgFaded: "bg-[#3375e3]/60", text: "text-[#3375e3]", border: "border-[#3375e3]" },
    "indigo": { hex: "#5a5ad9", bg: "bg-[#5a5ad9]", bgFaded: "bg-[#5a5ad9]/60", text: "text-[#5a5ad9]", border: "border-[#5a5ad9]" },
    "violet": { hex: "#8b55de", bg: "bg-[#8b55de]", bgFaded: "bg-[#8b55de]/60", text: "text-[#8b55de]", border: "border-[#8b55de]" },
    "purple": { hex: "#b24acf", bg: "bg-[#b24acf]", bgFaded: "bg-[#b24acf]/60", text: "text-[#b24acf]", border: "border-[#b24acf]" },
    "fuchsia": { hex: "#dd40bb", bg: "bg-[#dd40bb]", bgFaded: "bg-[#dd40bb]/60", text: "text-[#dd40bb]", border: "border-[#dd40bb]" },
    "pink": { hex: "#e45992", bg: "bg-[#e45992]", bgFaded: "bg-[#e45992]/60", text: "text-[#e45992]", border: "border-[#e45992]" },
    "rose": { hex: "#d1375c", bg: "bg-[#d1375c]", bgFaded: "bg-[#d1375c]/60", text: "text-[#d1375c]", border: "border-[#d1375c]" },
};

/** The hue a category or event is drawn in, for the `.wp-tag` / `.wp-event` classes to derive from. */
export const tagStyle = (hex: string | null | undefined): React.CSSProperties =>
    ({ "--tag": hex ?? "#94a3b8" } as React.CSSProperties);

/*
 * The redesign's toolbar button: a bare glyph in a 34px square that only takes a fill on hover.
 * No ring — the old circled icons were the loudest thing in the bar, and this bar is chrome.
 */
export const ICON_BUTTON_CLASS = "text-wp-fg-secondary group-hover:text-wp-fg";
export const ICON_BUTTON_WRAPPER_CLASS = "border-0 rounded-lg hover:bg-wp-track group";

/*
 * One class list, on the tooltip's content.
 *
 * v3 has no slots to get wrong: the arrow is a component of its own, and it inherits the
 * content's background, so the colour is stated once. Inverted against the page, as tooltips are.
 */
export const TOOLTIP_CLASSES = "bg-wp-fg text-wp-bg text-xs font-medium";

/*
 * Text and icons inside a popover menu.
 *
 * HeroUI paints the popover itself, but what we put inside one — a lucide icon, a section header,
 * a label of our own — takes its colour from the cascade. Stated once, applied wherever we hand
 * HeroUI our own content.
 */
export const MENU_ITEM_CLASS = "text-wp-fg";
