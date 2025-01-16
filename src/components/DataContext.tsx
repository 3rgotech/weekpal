import React, { createContext, useState, ReactNode } from 'react';

// Définir un type pour le contexte
interface DataContextType {
  tasks: string[];
  setTasks: React.Dispatch<React.SetStateAction<string[]>>;
  currentWeek: number;
  setCurrentWeek: React.Dispatch<React.SetStateAction<number>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

// Créer le contexte avec une valeur initiale de type `null` pour l'instant
export const DataContext = createContext<DataContextType | null>(null);

interface DataProviderProps {
  children: ReactNode; // Le type des enfants passés au provider
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<string[]>([]);
  const [currentWeek, setCurrentWeek] = useState<number>(49);
  const [categories, setCategories] = useState<string[]>(['Work', 'Personal']);

  return (
    <DataContext.Provider
      value={{ tasks, setTasks, currentWeek, setCurrentWeek, categories, setCategories }}
    >
      {children}
    </DataContext.Provider>
  );
};
