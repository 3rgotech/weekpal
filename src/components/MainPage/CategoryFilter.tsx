import React from 'react';

interface CategoryFilterProps {
  categories: string[];
  onCategorySelect: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories, onCategorySelect }) => {
  return (
    <select onChange={(e) => onCategorySelect(e.target.value)} className="p-2 border rounded">
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
};

export default CategoryFilter;
