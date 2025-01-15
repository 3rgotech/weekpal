import { createContext, useState } from 'react';
import React from "react";
export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(49);
  const [categories, setCategories] = useState(['Work', 'Personal']);

  return (
    <DataContext.Provider value={{ tasks, setTasks, currentWeek, setCurrentWeek, categories }}>
      {children}
    </DataContext.Provider>
  );
};
