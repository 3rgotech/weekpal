/*
 * Two backgrounds per colour, not one.
 *
 * A completed task's chip is faded, which used to be `bg-opacity-60` alongside whichever `bg-*`
 * the category resolved to. Tailwind 4 removed the opacity utilities in favour of a `/60` on the
 * colour itself — and since the colour is chosen at runtime there is no class to modify, only one
 * to pick. Fading the whole chip with `opacity-60` would be a line shorter and would take the
 * white label down with it.
 */
export const COLORS = {
    "red": { bg: "bg-red-500", bgFaded: "bg-red-500/60", text: "text-red-700", border: "border-red-500" },
    "orange": { bg: "bg-orange-500", bgFaded: "bg-orange-500/60", text: "text-orange-700", border: "border-orange-500" },
    "yellow": { bg: "bg-yellow-500", bgFaded: "bg-yellow-500/60", text: "text-yellow-700", border: "border-yellow-500" },
    "lime": { bg: "bg-lime-500", bgFaded: "bg-lime-500/60", text: "text-lime-700", border: "border-lime-500" },
    "green": { bg: "bg-green-500", bgFaded: "bg-green-500/60", text: "text-green-700", border: "border-green-500" },
    "emerald": { bg: "bg-emerald-500", bgFaded: "bg-emerald-500/60", text: "text-emerald-700", border: "border-emerald-500" },
    "teal": { bg: "bg-teal-500", bgFaded: "bg-teal-500/60", text: "text-teal-700", border: "border-teal-500" },
    "cyan": { bg: "bg-cyan-500", bgFaded: "bg-cyan-500/60", text: "text-cyan-700", border: "border-cyan-500" },
    "sky": { bg: "bg-sky-500", bgFaded: "bg-sky-500/60", text: "text-sky-700", border: "border-sky-500" },
    "blue": { bg: "bg-blue-500", bgFaded: "bg-blue-500/60", text: "text-blue-700", border: "border-blue-500" },
    "indigo": { bg: "bg-indigo-500", bgFaded: "bg-indigo-500/60", text: "text-indigo-700", border: "border-indigo-500" },
    "violet": { bg: "bg-violet-500", bgFaded: "bg-violet-500/60", text: "text-violet-700", border: "border-violet-500" },
    "purple": { bg: "bg-purple-500", bgFaded: "bg-purple-500/60", text: "text-purple-700", border: "border-purple-500" },
    "fuchsia": { bg: "bg-fuchsia-500", bgFaded: "bg-fuchsia-500/60", text: "text-fuchsia-700", border: "border-fuchsia-500" },
    "pink": { bg: "bg-pink-500", bgFaded: "bg-pink-500/60", text: "text-pink-700", border: "border-pink-500" },
    "rose": { bg: "bg-rose-500", bgFaded: "bg-rose-500/60", text: "text-rose-700", border: "border-rose-500" },
}

export const ICON_BUTTON_CLASS = "text-sky-950 dark:text-white group-hover:text-white group-hover:dark:text-sky-950";
export const ICON_BUTTON_WRAPPER_CLASS = "border-slate-300 dark:border-sky-900 hover:bg-sky-950 hover:dark:bg-white group";

/*
 * One class list, on the tooltip's content.
 *
 * HeroUI 2 needed a `classNames` object keyed by slot, and the two call sites disagreed about
 * which slot the arrow lived on — `IconButton` put its colour on `arrow`, this file put it on
 * `base`. One of them was always doing nothing. v3 has no slots to get wrong: the arrow is a
 * component of its own, and it inherits the content's background, so the colour is stated once.
 */
export const TOOLTIP_CLASSES = "bg-sky-950 dark:bg-white text-white dark:text-sky-950";