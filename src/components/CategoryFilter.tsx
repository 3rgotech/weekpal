import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Header, Label, ListBox, Select } from "@heroui/react";
import type { Key } from "react-aria-components";
import clsx from "clsx";
import { CircleSlash2, RotateCcw, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CLEAR_SELECTION_KEY, NO_CATEGORY_KEY } from "../utils/categories";
import { MENU_ITEM_CLASS } from "../utils/color";

const CategoryFilter: React.FC = () => {
  const { t } = useTranslation();
  const { categories, selectedCategories, setSelectedCategories } = useData();
  const [isOpen, setIsOpen] = useState(false);

  const items: Array<{
    key: string;
    label: string;
    startContent?: React.JSX.Element;
  }> = [
      { key: CLEAR_SELECTION_KEY, label: t("category.show_all"), startContent: <RotateCcw className={MENU_ITEM_CLASS} /> },
      ...categories.map((category) => ({
        key: category.id,
        label: category.name,
        startContent: (
          <div
            className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}
          ></div>
        ),
      })),
      { key: NO_CATEGORY_KEY, label: t("category.none"), startContent: <CircleSlash2 className={MENU_ITEM_CLASS} /> },
    ];

  /**
   * What the trigger says, on one line.
   *
   * `Select.Value` renders each selected item's own content, so a multiple selection stacked the
   * colour swatch above its label and then stacked every chosen category below the last — a
   * two-category filter was taller than the bar it sits in. The trigger states the selection
   * itself instead: the colours, and a name or a count.
   */
  const selected = selectedCategories
    .map((id) => categories.find((category) => category.id === id) ?? null);

  const summary = selectedCategories.length === 0
    ? t("category.all")
    : selectedCategories.length === 1
      ? (selected[0]?.name ?? t("category.none"))
      : t("category.selected", { count: selectedCategories.length });

  return (
    <Select
      aria-label="Category selection"
      selectionMode="multiple"
      className="max-w-lg w-56 flex-1"
      placeholder={t("category.all")}
      value={selectedCategories.map(String)}
      onChange={(keys: Key[]) => {
        // Category ids are UUID strings, so the selection is kept as strings. Coercing with
        // Number() turned every id into NaN and the filter matched nothing.
        let selectedKeys = keys.map(String);
        if (selectedKeys.includes(CLEAR_SELECTION_KEY)) {
          selectedKeys = [];
          setTimeout(() => {
            setIsOpen(false);
          }, 100);
        }
        setSelectedCategories(selectedKeys);
      }}
      isOpen={isOpen}
      onOpenChange={(open) => open !== isOpen && setIsOpen(open)}
    >
      {/* No `Select.Indicator`. v2 hid the chevron with a `selectorIcon: "hidden"` slot
          override; in v3 the indicator is a component, so leaving it out is the whole of it.
          The trigger keeps its transparent, full-height styling as plain classes. */}
      <Select.Trigger className="h-full flex grow items-center justify-center gap-2 bg-transparent shadow-none data-[hovered]:bg-transparent overflow-hidden">
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
      </Select.Trigger>
      <Select.Popover>
        <ListBox className="max-h-128 overflow-auto">
          <ListBox.Section>
            <Header className={clsx("pl-0", MENU_ITEM_CLASS)}>{t("category.help")}</Header>
            {items.map((item) => (
              <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                {item.startContent}
                <Label className={MENU_ITEM_CLASS}>{item.label}</Label>
              </ListBox.Item>
            ))}
          </ListBox.Section>
        </ListBox>
      </Select.Popover>
    </Select>
  );
};

export default CategoryFilter;
