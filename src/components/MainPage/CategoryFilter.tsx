import React, { useContext } from 'react';
import { DataContext } from '../../contexts/DataContext';


const CategoryFilter: React.FC = () => {
  const {categoryList, selectedCategory, setSelectedCategory} = useContext(DataContext);
  return (
    <select 
      onChange={(e) => setSelectedCategory(e.target.value.length === 0 ? null : parseInt(e.target.value, 10))} 
      className="p-2 border rounded"
    >
      <option value="" selected={selectedCategory === null}>All</option>
      {categoryList.map((category) => (
        <option key={category.id} value={category.id} selected={category.id === selectedCategory}>
          {category.label}
        </option>
      ))}
    </select>
  );
};

export default CategoryFilter;
