import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext } from "react";
import { DayOfWeek } from "../types";
import Task from "../data/task";
import TaskStore from "../store/TaskStore";
import CategoryStore from "../store/CategoryStore";
import Category from "../data/category";
import { useCalendar } from "./CalendarContext";
import useDayJs from "../utils/dayjs";
import Event from "../data/event";
import EventStore from "../store/EventStore";

interface DataContextProps {
  tasks: Array<Task>;
  findTask: (taskId: number) => Task | null;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  completeTask: (task: Task) => void;
  uncompleteTask: (task: Task) => void;
  moveTask: (task: Task, toDay: DayOfWeek, toOrder: number | null) => void;
  deleteTask: (task: Task) => void;
  events: Array<Event>;
  categories: Array<Category>;
  selectedCategories: number[];
  setSelectedCategories: (categories: number[]) => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentWeek } = useCalendar();
  const dayjs = useDayJs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const taskStore = useMemo(() => new TaskStore(), []);
  const categoryStore = useMemo(() => new CategoryStore(), []);
  const eventStore = useMemo(() => new EventStore(), []);
  useEffect(() => {
    if (taskStore) {
      taskStore.list(currentWeek).then((dbTasks) => {
        setTasks(dbTasks);
      });
    }
    if (categoryStore) {
      categoryStore.list().then((dbCategories) => {
        setCategories(dbCategories);
      });
    }
    if (eventStore) {
      eventStore.list(currentWeek).then((dbEvents) => {
        setEvents(dbEvents);
      });
    }
  }, [taskStore, categoryStore, eventStore, currentWeek, selectedCategories]);

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
    // If the task is completed, we don't allow reordering
    if (task.completedAt !== null) {
      if (task.dayOfWeek !== toDay) {
        // Only allow moving to different day, keeping it at the end
        task.dayOfWeek = toDay;
        updateTask(task);
      }
      return;
    }

    const tasksSourceDay = tasks.filter((t) =>
      t.weekCode === task.weekCode &&
      t.dayOfWeek === task.dayOfWeek &&
      t.completedAt === null // Only consider incomplete tasks for reordering
    );
    const tasksDestinationDay = tasks.filter((t) =>
      t.weekCode === task.weekCode &&
      t.dayOfWeek === toDay &&
      t.completedAt === null // Only consider incomplete tasks for reordering
    );
    const updatedTasks = [];

    if (task.dayOfWeek !== toDay) {
      const sourceTasksWithoutMoved = tasksSourceDay.filter((t) => t.id !== task.id);
      sourceTasksWithoutMoved.forEach((t, index) => {
        if (t.order !== index) {
          t.order = index;
          updatedTasks.push(t);
        }
      });

      const destinationTasksWithoutMoved = tasksDestinationDay.filter((t) => t.id !== task.id);
      const targetOrder = toOrder ?? destinationTasksWithoutMoved.length;

      destinationTasksWithoutMoved.forEach((t) => {
        if ((t.order ?? 0) >= targetOrder) {
          t.order = (t.order ?? 0) + 1;
          updatedTasks.push(t);
        }
      });

      task.dayOfWeek = toDay;
      task.order = targetOrder;
      updatedTasks.push(task);
    } else {
      const tasksWithoutMoved = tasksSourceDay.filter((t) => t.id !== task.id);
      const targetOrder = toOrder ?? tasksWithoutMoved.length;
      const currentOrder = task.order ?? 0;

      if (currentOrder !== targetOrder) {
        const allTasks = [...tasksWithoutMoved];
        allTasks.splice(targetOrder, 0, task);
        allTasks.forEach((t, index) => {
          if (t.order !== index) {
            t.order = index;
            updatedTasks.push(t);
          }
        });
      }
    }

    const uniqueUpdatedTasks = updatedTasks.filter((t, i, self) =>
      self.findIndex(t2 => t2.id === t.id) === i
    );

    uniqueUpdatedTasks.forEach((t) => updateTask(t));
  };

  const memoizedTasks = useMemo(() => {
    return tasks
      .filter(t => selectedCategories.length === 0 || selectedCategories.includes(t.categoryId ?? -1))
      .sort((a, b) => {
        // First sort by completion status
        if (a.completedAt === null && b.completedAt !== null) return -1;
        if (a.completedAt !== null && b.completedAt === null) return 1;

        // Then sort completed tasks by completion date
        if (a.completedAt && b.completedAt) {
          return dayjs(a.completedAt).isBefore(dayjs(b.completedAt)) ? -1 : 1;
        }

        // Sort incomplete tasks by order
        return (a.order ?? 0) > (b.order ?? 0) ? 1 : -1;
      });
  }, [tasks, selectedCategories]);

  const memoizedEvents = useMemo(() => {
    return events
      .filter(e => selectedCategories.length === 0 || selectedCategories.includes(e.categoryId ?? -1))
      .sort((a, b) => {
        return dayjs(a.startDate).isBefore(dayjs(b.startDate)) ? -1 : 1;
      });
  }, [events, selectedCategories]);

  return (
    <DataContext.Provider
      value={{
        tasks: memoizedTasks,
        findTask,
        addTask,
        updateTask,
        completeTask,
        uncompleteTask,
        moveTask,
        deleteTask,
        events: memoizedEvents,
        categories,
        selectedCategories,
        setSelectedCategories,
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
