import React, { createContext, useState, ReactNode, useEffect } from "react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import advancedFormat from "dayjs/plugin/advancedFormat";
import { Category, Task, TaskList, WeekTaskList } from "../types";
import { useLocalStorage } from "usehooks-ts";

// Ajouter le plugin weekOfYear
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);

const LOCAL_STORAGE_KEY = "tasks";

interface DataContextProps {
  currentDate: dayjs.Dayjs;
  currentWeekNumber: number;
  firstDayOfWeek: dayjs.Dayjs;
  tasks: WeekTaskList | null;
  setTasks: React.Dispatch<React.SetStateAction<WeekTaskList>>;
  setTasksStorage: React.Dispatch<React.SetStateAction<TaskList>>;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToToday: () => void;
  addTask: (dayOfWeek: keyof WeekTaskList, taskData: Partial<Task>) => void;
  updateTask: (
    dayOfWeek: keyof WeekTaskList,
    taskId: number,
    taskData: Partial<Task>
  ) => void;
  completeTask: (dayOfWeek: keyof WeekTaskList, taskId: number) => void;
  uncompleteTask: (dayOfWeek: keyof WeekTaskList, taskId: number) => void;
  moveTask: (
    from: keyof WeekTaskList,
    to: keyof WeekTaskList,
    order: number,
    taskId: number
  ) => void;
  deleteTask: (dayOfWeek: keyof WeekTaskList, taskId: number) => void;
  categoryList: Array<Category>;
  selectedCategory: number | null;
  setSelectedCategory: (category: number | null) => void;
}

const defaultWeekData: WeekTaskList = {
  "0": [],
  "1": [],
  "2": [],
  "3": [],
  "4": [],
  "5": [],
  "6": [],
  "7": [],
  someday: [],
};

const categories: Array<Category> = [
  { id: 1, label: "Urgent", color: "red" },
  { id: 2, label: "todo", color: "blue" },
  { id: 3, label: "when possible", color: "green" },
];

const DataContext = createContext<DataContextProps | undefined>(undefined);

const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [taskStorage, setTasksStorage] = useLocalStorage<TaskList>(
    LOCAL_STORAGE_KEY,
    {}
  );
  const [tasks, setTasks] = useState<WeekTaskList>(defaultWeekData);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [highestId, setHighestId] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const currentWeekNumber = currentDate.isoWeek(); // ✅ Définit le numéro de semaine
  const currentWeek = currentDate.format("YYYY[w]WW");
  const firstDayOfWeek = currentDate.startOf("isoWeek");

  useEffect(() => {
    // Find the highest ID
    const maxId = Object.values(taskStorage).reduce((acc1, weekData) => {
      const ids = Object.values(weekData).reduce((acc2, dayData) => {
        return [...acc2, ...dayData.map((task) => task.id)];
      }, []);
      return Math.max(acc1, ...ids);
    }, 0);
    setHighestId(maxId);
  }, [taskStorage]);

  useEffect(() => {
    console.log(selectedCategory);
    const allWeekTasks = taskStorage[currentWeek] ?? defaultWeekData;
    if (selectedCategory === null) {
      setTasks(allWeekTasks);
    } else {
      setTasks(
        Object.fromEntries(
          Object.keys(defaultWeekData).map((dayOfWeek) => [
            dayOfWeek,
            allWeekTasks[dayOfWeek].filter(
              (task) => task.category === selectedCategory
            ),
          ])
        ) as WeekTaskList
      );
    }
  }, [currentDate, selectedCategory]);
  // console.log(taskStorage, tasks);

  const goToPreviousWeek = () => {
    setCurrentDate((cd) => cd.subtract(1, "week"));
  };
  const goToNextWeek = () => {
    setCurrentDate((cd) => cd.add(1, "week"));
  };
  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  const addTask = (dayOfWeek: keyof WeekTaskList, taskData: Partial<Task>) => {
    if (!tasks) {
      return;
    }

    const task = {
      id: highestId + 1,
      title: taskData.title,
      description: taskData.description ?? null,
      order: tasks[dayOfWeek].length,
      completed_at: null,
      category: taskData.category ?? null,
    };

    // console.log(dayOfWeek, task);

    setTasks((prevTasks) => ({
      ...prevTasks,
      [dayOfWeek]: [...prevTasks[dayOfWeek], task],
    }));
    setTasksStorage((prevTasks) => ({
      ...prevTasks,
      [currentWeek]: {
        ...(prevTasks[currentWeek] ?? defaultWeekData),
        [dayOfWeek]: [
          ...((prevTasks[currentWeek] ?? {})[dayOfWeek] ?? []),
          task,
        ],
      },
    }));
  };

  const updateTask = (
    dayOfWeek: keyof WeekTaskList,
    taskId: number,
    taskData: Partial<Task>
  ) => {
    const updatedTasks = (tasks[dayOfWeek] ?? []).map((task) => {
      if (task.id === taskId) {
        return { ...task, ...taskData };
      }
      return task;
    });
    setTasks((prevTasks) => ({ ...prevTasks, [dayOfWeek]: updatedTasks }));
    setTasksStorage((prevTasks) => ({
      ...prevTasks,
      [currentWeek]: {
        ...prevTasks[currentWeek],
        [dayOfWeek]: updatedTasks,
      },
    }));
  };

  const completeTask = (dayOfWeek: keyof WeekTaskList, taskId: number) => {
    updateTask(dayOfWeek, taskId, { completed_at: dayjs().toISOString() });
  };

  const uncompleteTask = (dayOfWeek: keyof WeekTaskList, taskId: number) => {
    updateTask(dayOfWeek, taskId, { completed_at: null });
  };

  const deleteTask = (dayOfWeek: keyof WeekTaskList, taskId: number) => {
    setTasks((prevTasks) => {
      const updatedTasks = {
        ...prevTasks,
        [dayOfWeek]: prevTasks[dayOfWeek].filter((task) => task.id !== taskId),
      };

      // Mettre à jour le localStorage
      setTasksStorage((prev) => ({
        ...prev,
        [currentWeek]: updatedTasks,
      }));

      return updatedTasks;
    });
  };

  const moveTask = (
    fromDay: keyof WeekTaskList,
    toDay: keyof WeekTaskList,
    toOrder: number | null,
    taskId: number
  ) => {
    setTasks((prevTasks) => {
      // Create a clone to return later
      const newTasks = { ...prevTasks };
      // Find the task to move
      const taskMoved = prevTasks[fromDay].find((task) => task.id === taskId);
      if (!taskMoved) {
        return prevTasks;
      }
      // Remove the task from the source and reset the orders
      const fromTasks = prevTasks[fromDay]
        .filter((task) => task.id !== taskId)
        .map((task, index) => ({ ...task, order: index }))
        .sort((a, b) => a.order - b.order);
      newTasks[fromDay] = fromTasks;

      // Reset the orders in the target
      const toTasks = newTasks[toDay].map((task, index) => ({
        ...task,
        order: toOrder !== null && index >= toOrder ? index + 1 : index,
      }));

      toTasks.push({ ...taskMoved, order: toOrder ?? toTasks.length });
      newTasks[toDay] = toTasks.sort((a, b) => a.order - b.order);

      // Mettre à jour le localStorage
      setTasksStorage((prev) => ({
        ...prev,
        [currentWeek]: newTasks,
      }));

      return newTasks;
    });
  };

  return (
    <DataContext.Provider
      value={{
        tasks,
        setTasks,
        setTasksStorage,
        currentDate,
        currentWeekNumber,
        firstDayOfWeek,
        goToPreviousWeek,
        goToNextWeek,
        goToToday,
        addTask,
        updateTask,
        completeTask,
        uncompleteTask,
        moveTask,
        deleteTask,
        categoryList: categories,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export { DataContext, DataProvider };
