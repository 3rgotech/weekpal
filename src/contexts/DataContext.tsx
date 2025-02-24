import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext } from "react";
import { DayOfWeek } from "../types";
import Task from "../data/task";
import TaskStore from "../store/TaskStore";
import CategoryStore from "../store/CategoryStore";
import Category from "../data/category";
import { useCalendar } from "./CalendarContext";
import useDayJs from "../utils/dayjs";

interface DataContextProps {
  tasks: Task[];
  findTask: (taskId: number) => Task | null;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  completeTask: (task: Task) => void;
  uncompleteTask: (task: Task) => void;
  moveTask: (task: Task, toDay: DayOfWeek, toOrder: number | null) => void;
  deleteTask: (task: Task) => void;
  categories: Array<Category>;
  selectedCategory: number | null;
  setSelectedCategory: (category: number | null) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentWeek } = useCalendar();
  const dayjs = useDayJs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const taskStore = useMemo(() => new TaskStore(), []);
  const categoryStore = useMemo(() => new CategoryStore(), []);

  useEffect(() => {
    if (taskStore) {
      taskStore.list(currentWeek).then((dbTasks) => {
        setTasks(dbTasks.filter(
          t => selectedCategory === null || t.categoryId === selectedCategory
        ));
      });
    }
    if (categoryStore) {
      categoryStore.list().then((dbCategories) => {
        setCategories(dbCategories);
      });
    }
  }, [taskStore, categoryStore, currentWeek, selectedCategory]);

  const findTask = (taskId: number) => {
    return tasks.find((task) => task.id === taskId) ?? null;
  };

  const addTask = (task: Task) => {
    if (!taskStore) {
      return;
    }

    // Default properties
    task.weekCode = task.weekCode ?? currentWeek;
    task.order = task.order ?? tasks.filter((t) => t.dayOfWeek === task.dayOfWeek).length;

    taskStore.create(task).then((t) => {
      setTasks((prevTasks) => [...prevTasks, t]);
    });
  };

  const updateTask = (task: Task) => {
    if (!taskStore) {
      return;
    }
    taskStore.update(task).then((updatedTask) => {
      setTasks((prevTasks) => prevTasks.map((prevTask) => prevTask.id === updatedTask.id ? updatedTask : prevTask));
    });
  };


  const completeTask = (task: Task) => {
    task.completedAt = dayjs();
    updateTask(task);
  };

  const uncompleteTask = (task: Task) => {
    task.completedAt = null;
    updateTask(task);
  };

  const deleteTask = (task: Task) => {
    if (!taskStore) {
      return;
    }
    taskStore.delete(task).then(() => {
      setTasks((prevTasks) => prevTasks.filter((prevTask) => prevTask.id !== task.id));
    });
  };

  const moveTask = (
    task: Task,
    toDay: DayOfWeek,
    toOrder: number | null
  ) => {
    task.dayOfWeek = toDay;
    if (toOrder === null) {
      task.order = tasks.filter((t) => t.dayOfWeek === toDay).length;
    } else {
      task.order = toOrder;
    }
    updateTask(task);
  };

  return (
    <DataContext.Provider
      value={{
        tasks,
        findTask,
        addTask,
        updateTask,
        completeTask,
        uncompleteTask,
        moveTask,
        deleteTask,
        categories,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export { DataContext, DataProvider, useData };
