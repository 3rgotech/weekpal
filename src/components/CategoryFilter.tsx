import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Select, SelectItem, SelectSection } from "@heroui/react";
import clsx from "clsx";
import { CircleSlash2, RotateCcw, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CLEAR_SELECTION_KEY, NO_CATEGORY_KEY } from "../utils/categories";
const CategoryFilter: React.FC = () => {
  const { t } = useTranslation();
  const { categories, selectedCategories, setSelectedCategories } = useData();
  const [isOpen, setIsOpen] = useState(false);

  const items: Array<{
    key: string;
    label: string;
    startContent?: React.JSX.Element;
  }> = [
      { key: CLEAR_SELECTION_KEY, label: t("category.show_all"), startContent: <RotateCcw /> },
      ...categories.map((category) => ({
        key: category.id,
        label: category.name,
        startContent: (
          <div
            className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}
          ></div>
        ),
      })),
      { key: NO_CATEGORY_KEY, label: t("category.none"), startContent: <CircleSlash2 /> },
    ];

  return (
    <Select
      aria-label="Category selection"
      startContent={<Tag color="black" />}
      className="max-w-lg w-56 flex-1"
      classNames={{
        mainWrapper: "h-full flex flex-grow justify-center",
        trigger: "h-full bg-transparent shadow-none data-[hover=true]:bg-transparent",
        selectorIcon: "hidden",
      }}
      size="lg"
      selectionMode="multiple"
      maxListboxHeight={512}
      placeholder={t("category.all")}
      selectedKeys={selectedCategories.map(String)}
      onSelectionChange={(keys) => {
        // Category ids are UUID strings, so the selection is kept as strings. Coercing with
        // Number() turned every id into NaN and the filter matched nothing.
        let selectedKeys = Array.from(keys).map(String);
        if (selectedKeys.includes(CLEAR_SELECTION_KEY)) {
          selectedKeys = [];
          setTimeout(() => {
            setIsOpen(false);
          }, 100);
        }
        setSelectedCategories(selectedKeys);
      }}
      disallowEmptySelection={false}
      isOpen={isOpen}
      onOpenChange={(open) => open !== isOpen && setIsOpen(open)}
    >
      <SelectSection
        classNames={{ heading: "pl-0" }}
        title={t("category.help")}
      >
        {items.map((item) => (
          <SelectItem
            key={item.key}
            startContent={item.startContent}
            className="dark:text-white"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectSection>
    </Select>
  );
};

export default CategoryFilter;
