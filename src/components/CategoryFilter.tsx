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
      className="p-2 border rounded bg-white text-slate-800 border-blue-200 dark:bg-slate-700 dark:border-blue-700 dark:text-white"
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
