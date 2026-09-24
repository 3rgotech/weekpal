/*
 * The redesign's popover menu, as class lists for HeroUI's dropdown parts.
 *
 * HeroUI 3 draws a rounder, airier menu than the board's (a 32px popover radius and pill-shaped
 * rows). These restate the design's numbers — a 12px card with 6px of padding, 32px rows with a
 * 6px radius and a 16px glyph — on the parts that forward `className`, so every menu the phone
 * opens reads as one family with the board around it.
 */
export const MENU_POPOVER_CLASS =
    "rounded-xl border border-wp-border bg-wp-modal p-1.5 shadow-wp-pop min-w-[260px] max-w-[calc(100vw-24px)]";

export const MENU_ROW_CLASS =
    "min-h-8 gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] font-medium text-wp-fg data-[hovered=true]:bg-wp-track data-[focused=true]:bg-wp-track";

/** The glyph at the start of a row. */
export const MENU_ICON_CLASS = "shrink-0 text-wp-fg-secondary";

/** A right-aligned aside on a row: a date, a count. */
export const MENU_HINT_CLASS = "ml-auto shrink-0 whitespace-nowrap pl-3 text-xs font-medium text-wp-muted tabular-nums";

/** A section's small-caps label, "MOVE TASK TO". */
export const MENU_SECTION_LABEL_CLASS =
    "px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.8px] text-wp-muted";

export const MENU_SEPARATOR_CLASS = "my-[5px] mx-1 h-px bg-wp-border";
