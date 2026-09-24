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
 * `hex` is the same 500 shade as `bg`, as a value rather than a class: the redesign's soft chips
 * and event rows are *derived* from the hue (`.wp-tag`, `.wp-event` in index.css), and a colour
 * chosen at runtime can only reach a `color-mix()` through a custom property.
 */
export const COLORS = {
    "red": { hex: "#ef4444", bg: "bg-red-500", bgFaded: "bg-red-500/60", text: "text-red-700", border: "border-red-500" },
    "orange": { hex: "#f97316", bg: "bg-orange-500", bgFaded: "bg-orange-500/60", text: "text-orange-700", border: "border-orange-500" },
    "yellow": { hex: "#eab308", bg: "bg-yellow-500", bgFaded: "bg-yellow-500/60", text: "text-yellow-700", border: "border-yellow-500" },
    "lime": { hex: "#84cc16", bg: "bg-lime-500", bgFaded: "bg-lime-500/60", text: "text-lime-700", border: "border-lime-500" },
    "green": { hex: "#22c55e", bg: "bg-green-500", bgFaded: "bg-green-500/60", text: "text-green-700", border: "border-green-500" },
    "emerald": { hex: "#10b981", bg: "bg-emerald-500", bgFaded: "bg-emerald-500/60", text: "text-emerald-700", border: "border-emerald-500" },
    "teal": { hex: "#14b8a6", bg: "bg-teal-500", bgFaded: "bg-teal-500/60", text: "text-teal-700", border: "border-teal-500" },
    "cyan": { hex: "#06b6d4", bg: "bg-cyan-500", bgFaded: "bg-cyan-500/60", text: "text-cyan-700", border: "border-cyan-500" },
    "sky": { hex: "#0ea5e9", bg: "bg-sky-500", bgFaded: "bg-sky-500/60", text: "text-sky-700", border: "border-sky-500" },
    "blue": { hex: "#3b82f6", bg: "bg-blue-500", bgFaded: "bg-blue-500/60", text: "text-blue-700", border: "border-blue-500" },
    "indigo": { hex: "#6366f1", bg: "bg-indigo-500", bgFaded: "bg-indigo-500/60", text: "text-indigo-700", border: "border-indigo-500" },
    "violet": { hex: "#8b5cf6", bg: "bg-violet-500", bgFaded: "bg-violet-500/60", text: "text-violet-700", border: "border-violet-500" },
    "purple": { hex: "#a855f7", bg: "bg-purple-500", bgFaded: "bg-purple-500/60", text: "text-purple-700", border: "border-purple-500" },
    "fuchsia": { hex: "#d946ef", bg: "bg-fuchsia-500", bgFaded: "bg-fuchsia-500/60", text: "text-fuchsia-700", border: "border-fuchsia-500" },
    "pink": { hex: "#ec4899", bg: "bg-pink-500", bgFaded: "bg-pink-500/60", text: "text-pink-700", border: "border-pink-500" },
    "rose": { hex: "#f43f5e", bg: "bg-rose-500", bgFaded: "bg-rose-500/60", text: "text-rose-700", border: "border-rose-500" },
}

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
