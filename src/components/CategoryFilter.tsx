import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Select, SelectItem, SelectSection } from "@heroui/react";
import clsx from "clsx";
import { CircleSlash2, RotateCcw, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
const CategoryFilter: React.FC = () => {
  const { t } = useTranslation();
  const { categories, selectedCategories, setSelectedCategories } = useData();
  const [isOpen, setIsOpen] = useState(false);

  const items: Array<{
    key: string;
    label: string;
    startContent?: React.JSX.Element;
  }> = [
    { key: "-2", label: t("category.show_all"), startContent: <RotateCcw /> },
    ...categories.map((category) => ({
      key: (category.id ?? 0).toString(),
      label: category.name,
      startContent: (
        <div
          className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}
        ></div>
      ),
    })),
    { key: "-1", label: t("category.none"), startContent: <CircleSlash2 /> },
  ];

  return (
    <Select
      aria-label="Category selection"
      startContent={<Tag color="black" />}
      className="max-w-lg w-56 flex-1"
      classNames={{
        mainWrapper: "h-full flex flex-grow justify-center",
        trigger:
          "h-full bg-transparent shadow-none data-[hover=true]:bg-transparent",
      }}
      selectorIcon={<React.Fragment />}
      size="lg"
      selectionMode="multiple"
      maxListboxHeight={512}
      placeholder={t("category.all")}
      selectedKeys={selectedCategories.map(String)}
      onSelectionChange={(keys) => {
        let selectedKeys = Array.from(keys).map(Number);
        if (selectedKeys.includes(-2)) {
          selectedKeys = [];
          setTimeout(() => {
            setIsOpen(false);
          }, 100);
        }
        console.log("selectedKeys", selectedKeys);
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
