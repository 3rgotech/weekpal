import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Dropdown } from "@heroui/react";
import clsx from "clsx";
import { CircleSlash2, Crosshair, Pencil, RotateCcw, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  NO_CATEGORY_KEY,
  activeCategories,
  allCategoryKeys,
  toggleCategory,
} from "../utils/categories";
import { MENU_ITEM_CLASS } from "../utils/color";
import CategoryModal from "./CategoryModal";

/**
 * Which categories the board is showing.
 *
 * Reads as a set of switches rather than as a selection: every row starts on, and clicking one
 * turns it **off**. That is the way round people expect a filter to work — you take things away
 * from a full board — and it is the opposite of what this did, where an empty filter drew every
 * row unticked while showing everything.
 *
 * Built from plain rows rather than a `ListBox`. Each row carries a Focus button of its own, and
 * a listbox item swallows every click inside it for its own selection — so the two controls could
 * not be told apart. Here they are siblings, and the row's own handler never sees the Focus
 * button's clicks.
 */
const CategoryFilter: React.FC = () => {
  const { t } = useTranslation();
  const {
    categories,
    selectedCategories,
    setSelectedCategories,
    focusCategory,
  } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const all = allCategoryKeys(categories.map((category) => category.id));
  const active = activeCategories(selectedCategories, all);

  const rows = [
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
      swatch: (
        <span
          className={clsx("w-4 h-4 rounded-full shrink-0", category.getColorClass("bg"))}
          aria-hidden="true"
        />
      ),
    })),
    {
      key: NO_CATEGORY_KEY,
      label: t("category.none"),
      swatch: <CircleSlash2 size={16} className={clsx("shrink-0", MENU_ITEM_CLASS)} />,
    },
  ];

  const selected = selectedCategories
    .map((id) => categories.find((category) => category.id === id) ?? null);

  const summary = selectedCategories.length === 0
    ? t("category.all")
    : selectedCategories.length === 1
      ? (selected[0]?.name ?? t("category.none"))
      : t("category.selected", { count: selectedCategories.length });

  const focus = (key: string) => {
    focusCategory(key);
    setIsOpen(false);
  };

  return (
    <>
      <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
        <Dropdown.Trigger
          aria-label={t("actions.category_filter")}
          className="h-full flex grow items-center justify-center gap-2 max-w-lg w-56 flex-1 bg-transparent cursor-pointer overflow-hidden"
        >
          <Tag className="shrink-0 text-sky-950 dark:text-white" />

          <span className="flex items-center gap-1 min-w-0" data-testid="category-summary">
            {/* Three swatches at most: past that the count is the useful part, and the row has to
                stay inside a bar that is one line tall. */}
            {selected.slice(0, 3).map((category, index) => (
              <span
                key={selectedCategories[index]}
                className={clsx(
                  "w-3 h-3 rounded-full shrink-0",
                  category ? category.getColorClass("bg") : "bg-slate-400",
                )}
                aria-hidden="true"
              />
            ))}
            <span className="truncate text-sky-950 dark:text-white">{summary}</span>
          </span>
        </Dropdown.Trigger>

        {/* No `Dropdown.Menu`: its items swallow every click inside them for their own
            selection, which is exactly what a per-row Focus button cannot survive. The popover
            takes ordinary children. */}
        <Dropdown.Popover className="p-1 w-64">
          <p className={clsx("px-2 py-1 text-xs", MENU_ITEM_CLASS)}>{t("category.help")}</p>

          <button
            type="button"
            onClick={() => {
              setSelectedCategories([]);
              setIsOpen(false);
            }}
            disabled={selectedCategories.length === 0}
            className={clsx(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer",
              "hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-default",
              MENU_ITEM_CLASS,
            )}
          >
            <RotateCcw size={16} className="shrink-0" />
            {t("category.show_all")}
          </button>

          <ul className="max-h-96 overflow-auto">
            {rows.map((row) => {
              const on = active.includes(row.key);

              return (
                /* The row and its Focus button are siblings, not nested — a button inside a
                   button is invalid, and the inner one's clicks would bubble into the outer's
                   handler and toggle the row on the way past. */
                <li key={row.key} className="flex items-stretch gap-0.5">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={(event) => {
                      // Shift is the shortcut for the Focus button beside it, so the common case
                      // stays one click and the quick one needs no aiming.
                      if (event.shiftKey) {
                        focus(row.key);

                        return;
                      }

                      setSelectedCategories(toggleCategory(selectedCategories, row.key, all));
                    }}
                    className={clsx(
                      "flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-left cursor-pointer",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      MENU_ITEM_CLASS,
                      // Off is stated twice over — the colour drains out of the swatch and the
                      // label goes italic — because a muted label alone is easy to read as
                      // "disabled" rather than as "switched off".
                      !on && "opacity-45 italic",
                    )}
                  >
                    {row.swatch}
                    <span className="truncate">{row.label}</span>
                  </button>

                  <button
                    type="button"
                    aria-label={t("category.focus_only", { name: row.label })}
                    title={t("category.focus_only", { name: row.label })}
                    onClick={() => focus(row.key)}
                    className={clsx(
                      "shrink-0 px-2 rounded-md cursor-pointer",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      MENU_ITEM_CLASS,
                    )}
                  >
                    <Crosshair size={14} />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Outside the list on purpose: this opens an editor, it does not filter anything. */}
          <div className="border-t border-slate-200 dark:border-slate-600 mt-1 pt-1">
            <button
              type="button"
              className={clsx(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-left",
                "hover:bg-slate-100 dark:hover:bg-slate-700",
                MENU_ITEM_CLASS,
              )}
              onClick={() => {
                setIsOpen(false);
                setEditing(true);
              }}
            >
              <Pencil size={16} className="shrink-0" />
              {t("category.edit_categories")}
            </button>
          </div>
        </Dropdown.Popover>
      </Dropdown>

      <CategoryModal isOpen={editing} onOpenChange={setEditing} />
    </>
  );
};

export default CategoryFilter;
