import React from 'react';

interface CategoryFilterProps {
  onCategoryChange: (category: string) => void;
}

const categories = ['all', 'work', 'personal', 'other'];

const CategoryFilter: React.FC<CategoryFilterProps> = ({ onCategoryChange }) => {
  return (
    <select onChange={(e) => onCategoryChange(e.target.value)} className="p-2 border rounded">
      {categories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
};

export default CategoryFilter;
