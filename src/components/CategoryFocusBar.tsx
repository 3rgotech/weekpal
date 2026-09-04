import React, { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useData } from "../contexts/DataContext";
import { NO_CATEGORY_KEY } from "../utils/categories";

/**
 * The strip that says the board is showing one category, and gets you out of it.
 *
 * Focus hides tasks, events and project lists, so it cannot be a silent state: the way out has
 * to be on screen wherever the board is. It takes its own row under the top bar rather than
 * floating over the board — the same reasoning as `UpdateBar`, and on a phone the alternative
 * would be a thing sitting on top of the day pills.
 *
 * Escape leaves focus too. Both boards are reachable by keyboard and the chip that turns focus
 * on is a long way from wherever the pointer has since gone.
 */
const CategoryFocusBar: React.FC = () => {
    const { t } = useTranslation();
    const { categories, focusedCategory, clearFocus } = useData();

    useEffect(() => {
        if (focusedCategory === null) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                clearFocus();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [focusedCategory, clearFocus]);

    if (focusedCategory === null) {
        return null;
    }

    const category = categories.find((c) => c.id === focusedCategory) ?? null;

    // A focus on the inbox entry has no category to take a name or a colour from — it is the
    // absence of one — so it borrows the same label the filter uses for it.
    const name = category?.name
        ?? (focusedCategory === NO_CATEGORY_KEY ? t("category.none") : focusedCategory);

    return (
        <div
            className="flex items-center justify-between gap-2 px-3 py-1.5 bg-sky-50 dark:bg-sky-900 border-b border-sky-200 dark:border-sky-800 text-sm"
            role="status"
        >
            <div className="flex items-center gap-2 min-w-0">
                <span
                    className={clsx(
                        "w-3 h-3 rounded-full shrink-0",
                        category ? category.getColorClass("bg") : "bg-slate-400",
                    )}
                    aria-hidden="true"
                />
                <span className="truncate text-sky-900 dark:text-sky-100">
                    {t("category.focused", { name })}
                </span>
            </div>

            <button
                type="button"
                className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md text-sky-900 dark:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-800"
                onClick={clearFocus}
            >
                <X size={14} />
                {t("category.focus_exit")}
            </button>
        </div>
    );
};

export default CategoryFocusBar;
