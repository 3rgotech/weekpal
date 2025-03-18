import React from "react";
import { useData } from "../contexts/DataContext";

const CategoryFilter: React.FC = () => {
  const { categories, selectedCategory, setSelectedCategory } =
    useData();
  return (
    <select
      onChange={(e) =>
        setSelectedCategory(
          e.target.value.length === 0 ? null : parseInt(e.target.value, 10)
        )
      }
      className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      value={selectedCategory ?? ""}
    >
      <option value="">
        All
      </option>
      {categories.map((category) => (
        <option
          key={category.id}
          value={category.id}
        >
          {category.name}
        </option>
      ))}
    </select>
  );
};

export default CategoryFilter;
