import React, { useState } from "react";
import { useData } from "../contexts/DataContext";
import { Select, SelectItem } from "@heroui/react";
import clsx from "clsx";
import { CircleSlash2, RotateCcw, Tag } from "lucide-react";

const CategoryFilter: React.FC = () => {
  const { categories, selectedCategories, setSelectedCategories } = useData();
  const [isOpen, setIsOpen] = useState(false);


  const items: Array<{ key: string, label: string, startContent?: React.JSX.Element }> = [
    { key: "-2", label: "All", startContent: <RotateCcw /> },
    ...categories.map(category => ({
      key: (category.id ?? 0).toString(),
      label: category.name,
      startContent: <div className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}></div>
    })),
    { key: "-1", label: "None", startContent: <CircleSlash2 /> },
  ]
  console.log("categories", categories);
  console.log("items", items);
  console.log("selectedCategories", selectedCategories);
  return (
    <Select
      startContent={<Tag />}
      className="max-w-lg w-48 flex-1"
      size="md"
      selectionMode="multiple"
      placeholder="All"
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
      {items.map(item => (
        <SelectItem
          key={item.key}
          startContent={item.startContent}
          className="dark:text-white"
        >
          {item.label}
        </SelectItem>
      ))}

    </Select>
  );
};

export default CategoryFilter;
