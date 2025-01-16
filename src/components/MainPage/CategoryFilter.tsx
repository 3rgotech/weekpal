import React, { useState } from 'react';
import SettingsSvg from '../svg/SettingsSvg';

interface CategoryFilterProps {
  categories: string[];
  onCategorySelect: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ categories = [], onCategorySelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const category = event.target.value;
    setSelectedCategory(category);
    onCategorySelect(category);
  };

  return (
    <div>
      <label htmlFor="category-select">
      </label>
      <select id="category-select" value={selectedCategory} onChange={handleCategoryChange}>
        <option value="">{SettingsSvg.title} {/* je veux le svg ici */}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <button onClick={() => document.getElementById('category-select')?.focus()}>
        Focus Select
      </button>
    </div>
  );
};

export default CategoryFilter;
