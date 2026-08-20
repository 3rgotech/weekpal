import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext } from "react";
import { DayOfWeek, ITaskAdapter, ICategoryAdapter, INoteAdapter, IHistoryAdapter } from "../types";
import Task, { WeeklyTask, SomedayTask } from "../data/task";
import TaskStore from "../store/TaskStore";
import CategoryStore from "../store/CategoryStore";
import NoteStore from "../store/NoteStore";
import Category from "../data/category";
import { useCalendar } from "./CalendarContext";
import useDayJs from "../utils/dayjs";
import Event from "../data/event";
import EventStore from "../store/EventStore";
import { NO_CATEGORY_KEY } from "../utils/categories";

interface DataContextProps {
  tasks: Array<Task>;
  findTask: (taskId: string) => Task | null;
  addTask: (task: WeeklyTask | SomedayTask) => void;
  updateTask: (task: Task) => void;
  completeTask: (task: Task) => void;
  uncompleteTask: (task: Task) => void;
  moveTask: (task: Task, toDay: DayOfWeek, toOrder: number | null) => void;
  deleteTask: (task: Task) => void;
  events: Array<Event>;
  categories: Array<Category>;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  taskStore: TaskStore | null;
  categoryStore: CategoryStore | null;
  noteStore: NoteStore | null;
  /**
   * Passed through rather than wrapped in a store: history is read-only and server-derived, so
   * there is no local table for a store to sit in front of.
   */
  historyAdapter: IHistoryAdapter | null;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
  taskAdapter?: ITaskAdapter | null;
  categoryAdapter?: ICategoryAdapter | null;
  noteAdapter?: INoteAdapter | null;
  historyAdapter?: IHistoryAdapter | null;
}

const DataProvider: React.FC<DataProviderProps> = ({
  children,
  taskAdapter = null,
  categoryAdapter = null,
  noteAdapter = null,
  historyAdapter = null
}) => {
  const { currentWeek } = useCalendar();
  const dayjs = useDayJs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const taskStore = useMemo(() => new TaskStore(taskAdapter || undefined), [taskAdapter]);
  const categoryStore = useMemo(() => new CategoryStore(categoryAdapter || undefined), [categoryAdapter]);
  const eventStore = useMemo(() => new EventStore(), []);
  const noteStore = useMemo(() => new NoteStore(noteAdapter || undefined), [noteAdapter]);

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

  const findTask = (taskId: string) => {
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

  /**
   * Persist a set of tasks that changed together.
   *
   * A move re-indexes every sibling it displaced, and those writes only make sense as a unit:
   * sent one at a time, a dropped connection halfway through leaves the board holding an order
   * the server never saw in full. `putMany` queues them as a single batch upsert.
   */
  const updateTasks = (updated: Task[]) => {
    if (!taskStore || updated.length === 0) {
      return;
    }

    const byId = new Map(updated.map((task) => [task.id, task]));

    taskStore.putMany(updated).then(() => {
      setTasks((prevTasks) => {
        const merged = prevTasks.map((prevTask) => byId.get(prevTask.id) ?? prevTask);
        const added = updated.filter((task) => !prevTasks.some((prev) => prev.id === task.id));

        return [...merged, ...added];
      });
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
        // Same id, different bucket. This used to be a delete followed by a create, which gave
        // the task a new identity and dropped its history with it — the defect the merged
        // `tasks` table exists to remove. A move is now just an upsert with no week.
        const convertedTask = new SomedayTask({ ...task });

        const sourceTasksWithoutMoved = tasks.filter((t) =>
          t.taskType === 'weekly' &&
          t instanceof WeeklyTask &&
          t.weekCode === task.weekCode &&
          t.dayOfWeek === task.dayOfWeek &&
          t.id !== task.id &&
          t.completedAt === null
        );

        const updatedTasks: Task[] = [];

        sourceTasksWithoutMoved.forEach((t, index) => {
          if (t.order !== index) {
            t.order = index;
            updatedTasks.push(t);
          }
        });

        const somedayTasks = tasks.filter((t) =>
          t.taskType === 'someday' &&
          t.completedAt === null
        );
        convertedTask.order = toOrder ?? somedayTasks.length;
        updatedTasks.push(convertedTask);

        updateTasks(updatedTasks);
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

      updateTasks(uniqueUpdatedTasks);
    } else if (task instanceof SomedayTask && toDay !== 'someday') {
      // Someday onto a day — again an upsert that keeps the id, not a delete and a create.
      const convertedTask = new WeeklyTask({
        ...task,
        weekCode: currentWeek,
        dayOfWeek: toDay
      });

      const somedayTasks = tasks.filter((t) =>
        t.taskType === 'someday' &&
        t.id !== task.id &&
        t.completedAt === null
      );

      const updatedTasks: Task[] = [];

      somedayTasks.forEach((t, index) => {
        if (t.order !== index) {
          t.order = index;
          updatedTasks.push(t);
        }
      });

      const weekDayTasks = tasks.filter((t) =>
        t.taskType === 'weekly' &&
        t instanceof WeeklyTask &&
        t.dayOfWeek === toDay &&
        t.completedAt === null
      );
      convertedTask.order = toOrder ?? weekDayTasks.length;
      updatedTasks.push(convertedTask);

      updateTasks(updatedTasks);
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

        const updatedTasks: Task[] = [];

        allTasks.forEach((t, index) => {
          if (t.order !== index) {
            t.order = index;
            updatedTasks.push(t);
          }
        });

        updateTasks(updatedTasks);
      }
    }
  };

  const memoizedTasks = useMemo(() => {
    return tasks
      .filter(t => selectedCategories.length === 0 || selectedCategories.includes(t.categoryId ?? NO_CATEGORY_KEY))
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
      .filter(e => selectedCategories.length === 0 || selectedCategories.includes(e.categoryId ?? NO_CATEGORY_KEY))
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
        noteStore,
        historyAdapter,
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
