import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext } from "react";
import { DayOfWeek, ITaskAdapter, ICategoryAdapter } from "../types";
import Task, { WeeklyTask, SomedayTask } from "../data/task";
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
  addTask: (task: WeeklyTask | SomedayTask) => void;
  updateTask: (task: Task) => void;
  completeTask: (task: Task) => void;
  uncompleteTask: (task: Task) => void;
  moveTask: (task: Task, toDay: DayOfWeek, toOrder: number | null) => void;
  deleteTask: (task: Task) => void;
  events: Array<Event>;
  categories: Array<Category>;
  selectedCategories: number[];
  setSelectedCategories: (categories: number[]) => void;
  taskStore: TaskStore | null;
  categoryStore: CategoryStore | null;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
  taskAdapter?: ITaskAdapter | null;
  categoryAdapter?: ICategoryAdapter | null;
}

const DataProvider: React.FC<DataProviderProps> = ({
  children,
  taskAdapter = null,
  categoryAdapter = null
}) => {
  const { currentWeek } = useCalendar();
  const dayjs = useDayJs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const taskStore = useMemo(() => new TaskStore(taskAdapter || undefined), [taskAdapter]);
  const categoryStore = useMemo(() => new CategoryStore(categoryAdapter || undefined), [categoryAdapter]);
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

  const addTask = (task: WeeklyTask | SomedayTask) => {
    if (!taskStore) {
      return;
    }

    // Set default properties
    if (task instanceof WeeklyTask) {
      task.weekCode = task.weekCode ?? currentWeek;
      // Count tasks in the same day for default order
      const sameDayTasks = tasks.filter((t) =>
        t instanceof WeeklyTask &&
        (t.dayOfWeek ?? null) === task.dayOfWeek
      );
      task.order = task.order ?? sameDayTasks.length;
    } else if (task instanceof SomedayTask) {
      // Count someday tasks for default order
      // TODO : only count visible tasks
      const somedayTasks = tasks.filter((t) => t instanceof SomedayTask);
      task.order = task.order ?? somedayTasks.length;
    }

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
      if (task instanceof WeeklyTask && task.dayOfWeek !== toDay) {
        // Only allow moving to different day, keeping it at the end
        // Create a new WeeklyTask with the updated day
        const updatedTask = new WeeklyTask({
          ...task,
          dayOfWeek: toDay
        });
        updateTask(updatedTask);
      }
      return;
    }

    // Handle task movement based on task type and destination
    if (task instanceof WeeklyTask) {
      // Moving a WeeklyTask between days
      const isChangingToSomeday = toDay === 'someday';

      if (isChangingToSomeday) {
        // Convert to a SomedayTask
        const convertedTask = new SomedayTask({
          ...task,
          weekCode: currentWeek
        });

        // Update orders of source day tasks
        const sourceTasksWithoutMoved = tasks.filter((t) =>
          t.taskType === 'weekly' &&
          t instanceof WeeklyTask &&
          t.weekCode === task.weekCode &&
          t.dayOfWeek === task.dayOfWeek &&
          t.id !== task.id &&
          t.completedAt === null
        );

        // Reorder source tasks after removal
        sourceTasksWithoutMoved.forEach((t, index) => {
          if (t.order !== index) {
            t.order = index;
            updateTask(t);
          }
        });

        // Count someday tasks for default order
        const somedayTasks = tasks.filter((t) =>
          t.taskType === 'someday' &&
          t.completedAt === null
        );
        convertedTask.order = toOrder ?? somedayTasks.length;

        // Replace the weekly task with the someday task
        taskStore.delete(task).then(() => {
          taskStore.create(convertedTask).then((t) => {
            setTasks((prevTasks) => [
              ...prevTasks.filter(pt => pt.id !== task.id),
              t
            ]);
          });
        });
        return;
      }

      // Moving between week days
      const tasksSourceDay = tasks.filter((t) =>
        t.taskType === 'weekly' &&
        t instanceof WeeklyTask &&
        t.weekCode === task.weekCode &&
        t.dayOfWeek === task.dayOfWeek &&
        t.completedAt === null
      );

      const tasksDestinationDay = tasks.filter((t) =>
        t.taskType === 'weekly' &&
        t instanceof WeeklyTask &&
        t.weekCode === task.weekCode &&
        t.dayOfWeek === toDay &&
        t.completedAt === null
      );

      const updatedTasks = [];

      if (task.dayOfWeek !== toDay) {
        // Moving to a different day
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

        // Create an updated copy of the task
        const updatedTask = new WeeklyTask({
          ...task,
          dayOfWeek: toDay,
          order: targetOrder
        });
        updatedTasks.push(updatedTask);
      } else {
        // Reordering within the same day
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
    } else if (task instanceof SomedayTask && toDay !== 'someday') {
      // Convert from SomedayTask to WeeklyTask
      const convertedTask = new WeeklyTask({
        ...task,
        weekCode: currentWeek,
        dayOfWeek: toDay
      });

      // Update orders of someday tasks
      const somedayTasks = tasks.filter((t) =>
        t.taskType === 'someday' &&
        t.id !== task.id &&
        t.completedAt === null
      );

      // Reorder someday tasks after removal
      somedayTasks.forEach((t, index) => {
        if (t.order !== index) {
          t.order = index;
          updateTask(t);
        }
      });

      // Count week day tasks for default order
      const weekDayTasks = tasks.filter((t) =>
        t.taskType === 'weekly' &&
        t instanceof WeeklyTask &&
        t.dayOfWeek === toDay &&
        t.completedAt === null
      );
      convertedTask.order = toOrder ?? weekDayTasks.length;

      // Replace the someday task with the weekly task
      taskStore.delete(task).then(() => {
        taskStore.create(convertedTask).then((t) => {
          setTasks((prevTasks) => [
            ...prevTasks.filter(pt => pt.id !== task.id),
            t
          ]);
        });
      });
    } else if (task instanceof SomedayTask) {
      // Reordering someday tasks
      const somedayTasks = tasks.filter((t) =>
        t.taskType === 'someday' &&
        t.completedAt === null
      );

      const targetOrder = toOrder ?? somedayTasks.length - 1;
      const currentOrder = task.order ?? 0;

      if (currentOrder !== targetOrder) {
        const tasksWithoutMoved = somedayTasks.filter((t) => t.id !== task.id);
        const allTasks = [...tasksWithoutMoved];
        allTasks.splice(targetOrder, 0, task);

        allTasks.forEach((t, index) => {
          if (t.order !== index) {
            t.order = index;
            updateTask(t);
          }
        });
      }
    }
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
        return dayjs(a.startHour).isBefore(dayjs(b.startHour)) ? -1 : 1;
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
        taskStore,
        categoryStore,
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
