import React, { createContext, useState, ReactNode, useEffect, useMemo, useContext, useCallback } from "react";
import { DayOfWeek, ITaskAdapter, ICategoryAdapter, INoteAdapter, IHistoryAdapter, IProjectAdapter, TaskLocation } from "../types";
import Task, { WeeklyTask, SomedayTask } from "../data/task";
import TaskStore from "../store/TaskStore";
import CategoryStore from "../store/CategoryStore";
import NoteStore from "../store/NoteStore";
import ProjectStore from "../store/ProjectStore";
import Project from "../data/project";
import Category from "../data/category";
import { useCalendar } from "./CalendarContext";
import useDayJs from "../utils/dayjs";
import Event from "../data/event";
import EventStore from "../store/EventStore";
import {
  CategoryFilterState,
  NO_CATEGORY_FILTER,
  focusCategory as focusCategoryIn,
  forgetCategory,
  leaveFocus,
  matchesCategorySelection,
  selectCategories,
  toggleFocus,
} from "../utils/categories";
import { newId } from "../utils/id";

/**
 * Where a task left behind in a past week goes next.
 *
 * `sameDay` keeps the weekday it was planned for — a Tuesday task stays a Tuesday task, one
 * week later — because most leftovers slipped for reasons that repeat weekly.
 */
export type RescueDestination = 'sameDay' | 'thisWeek' | 'someday';

interface DataContextProps {
  tasks: Array<Task>;
  /**
   * The same week, before the category filter.
   *
   * A capacity warning is about the list, not the view: narrowing the board to one category must
   * not make a day look emptier than it is. Everything that *renders* tasks wants `tasks`; only
   * the counting wants this.
   */
  allTasks: Array<Task>;
  findTask: (taskId: string) => Task | null;
  addTask: (task: WeeklyTask | SomedayTask) => void;
  updateTask: (task: Task) => void;
  completeTask: (task: Task) => void;
  uncompleteTask: (task: Task) => void;
  moveTask: (task: Task, toDay: DayOfWeek, toOrder: number | null) => void;
  /** Bring a task that slipped out of a past week back into the present. */
  rescueTask: (task: Task, destination: RescueDestination) => Promise<void>;
  /** Send a task to a week and day of your choosing, keeping its identity. */
  relocateTask: (task: Task, target: TaskLocation) => Promise<void>;
  /** Copy a task into the same place, unfinished. */
  duplicateTask: (task: Task) => Promise<void>;
  /**
   * Unfinished tasks from weeks that have already ended.
   *
   * Held here rather than inside the review that shows them, because the top bar needs the same
   * number for its badge — and a badge counting something other than what the review lists is
   * worse than no badge at all.
   */
  leftovers: WeeklyTask[];
  /** False until the first look, so the badge and the review can tell empty from unknown. */
  leftoversLoaded: boolean;
  refreshLeftovers: () => Promise<WeeklyTask[]>;
  deleteTask: (task: Task) => void;
  events: Array<Event>;
  categories: Array<Category>;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  /**
   * The one category the board has been narrowed to, or null when it shows everything it is
   * filtered to show.
   *
   * Focus is the filter, not a second mechanism beside it: focusing sets the selection to that
   * one category and remembers what was selected before, so leaving focus puts the board back
   * the way it was rather than dropping the person into an unfiltered week they did not ask for.
   */
  focusedCategory: string | null;
  /** Narrow the board to one category, keeping the selection it replaces. */
  focusCategory: (categoryId: string) => void;
  /** Focus a category, or leave focus if that category is already the focused one. */
  toggleFocusCategory: (categoryId: string) => void;
  /** Leave focus and restore the selection focus replaced. */
  clearFocus: () => void;
  taskStore: TaskStore | null;
  categoryStore: CategoryStore | null;
  /** Create or rename a category. The client owns the id, so both are one upsert. */
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (category: Category) => Promise<void>;
  noteStore: NoteStore | null;
  projectStore: ProjectStore | null;
  projects: Array<Project>;
  saveProject: (project: Project) => Promise<void>;
  deleteProject: (project: Project) => Promise<void>;
  /**
   * Each loaded project's backlog, keyed by project id.
   *
   * Held here rather than in the drawer that draws it, because a backlog task is a task like any
   * other: it can be dragged onto a day, ticked, or deleted, and every one of those has to leave
   * the list it came from. While the drawer owned this state, the board could not even see those
   * tasks — `findTask` missed them, so a drag out of the drawer ended in nothing at all.
   */
  backlogs: Record<string, Task[]>;
  /** Fetch a project's unscheduled tasks; safe to call again for a refresh. */
  loadBacklog: (projectId: string) => Promise<void>;
  /** Send a task to a project's backlog: it keeps its identity and loses its week. */
  moveTaskToProject: (task: Task, projectId: string) => Promise<void>;
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
  projectAdapter?: IProjectAdapter | null;
  historyAdapter?: IHistoryAdapter | null;
}

const DataProvider: React.FC<DataProviderProps> = ({
  children,
  taskAdapter = null,
  categoryAdapter = null,
  noteAdapter = null,
  projectAdapter = null,
  historyAdapter = null
}) => {
  const { currentWeek, thisWeek } = useCalendar();
  const dayjs = useDayJs();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Selection and focus travel together — see `CategoryFilterState`, which is where the
  // transitions live so they can be reasoned about without a provider around them.
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterState>(NO_CATEGORY_FILTER);

  const selectedCategories = categoryFilter.selected;
  const focusedCategory = categoryFilter.focus?.categoryId ?? null;

  const setSelectedCategories = useCallback((categories: string[]) => {
    setCategoryFilter(selectCategories(categories));
  }, []);

  const focusCategory = useCallback((categoryId: string) => {
    setCategoryFilter((current) => focusCategoryIn(current, categoryId));
  }, []);

  const clearFocus = useCallback(() => {
    setCategoryFilter(leaveFocus);
  }, []);

  const toggleFocusCategory = useCallback((categoryId: string) => {
    setCategoryFilter((current) => toggleFocus(current, categoryId));
  }, []);

  const taskStore = useMemo(() => new TaskStore(taskAdapter || undefined), [taskAdapter]);
  const categoryStore = useMemo(() => new CategoryStore(categoryAdapter || undefined), [categoryAdapter]);
  const eventStore = useMemo(() => new EventStore(), []);
  const noteStore = useMemo(() => new NoteStore(noteAdapter || undefined), [noteAdapter]);
  const projectStore = useMemo(() => new ProjectStore(projectAdapter || undefined), [projectAdapter]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [backlogs, setBacklogs] = useState<Record<string, Task[]>>({});
  const [leftovers, setLeftovers] = useState<WeeklyTask[]>([]);
  const [leftoversLoaded, setLeftoversLoaded] = useState(false);

  const refreshLeftovers = useCallback(async (): Promise<WeeklyTask[]> => {
    if (!taskStore) {
      return [];
    }

    const found = await taskStore.leftovers();
    setLeftovers(found);
    setLeftoversLoaded(true);

    return found;
  }, [taskStore]);

  useEffect(() => {
    refreshLeftovers();
  }, [refreshLeftovers]);

  /**
   * A task stops being outstanding the moment it is ticked, deleted or moved.
   *
   * Applied to every one of those actions rather than only the ones the review triggers: ticking
   * a past-week task off on the board settles it just as much, and the badge has to agree.
   */
  const dropLeftover = (id: string) => {
    setLeftovers((previous) => previous.filter((leftover) => leftover.id !== id));
  };

  const refreshProjects = useCallback(async () => {
    if (projectStore) {
      setProjects(await projectStore.list());
    }
  }, [projectStore]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const refreshCategories = useCallback(async () => {
    if (categoryStore) {
      setCategories(await categoryStore.list());
    }
  }, [categoryStore]);

  const saveCategory = async (category: Category) => {
    if (!categoryStore) {
      return;
    }

    await categoryStore.update(category);
    await refreshCategories();
  };

  const deleteCategory = async (category: Category) => {
    if (!categoryStore) {
      return;
    }

    await categoryStore.delete(category);
    await refreshCategories();

    // Tasks are not deleted with it — the column drops to `category_id: null` server-side — so
    // the week is read again. Without this the board keeps colouring tasks by a category that no
    // longer exists until the next reload, and the filter offers a row that matches nothing.
    if (taskStore) {
      setTasks(await taskStore.list(currentWeek));
    }

    // A filter or focus pointing at it would otherwise hide the whole board behind a category
    // that is gone, with no row left to click to undo it.
    setCategoryFilter((current) => forgetCategory(current, category.id));
  };

  const saveProject = async (project: Project) => {
    await projectStore.update(project);
    await refreshProjects();
  };

  const deleteProject = async (project: Project) => {
    await projectStore.delete(project);
    await refreshProjects();

    // Its tasks are not deleted with it — they lose their project and become ordinary Some day
    // tasks — so the list goes and the board is read again, or they would be in neither place
    // until the next reload.
    setBacklogs((prev) => {
      const { [project.id]: removed, ...rest } = prev;
      return rest;
    });

    if (taskStore) {
      setTasks(await taskStore.list(currentWeek));
    }
  };

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
    return tasks.find((task) => task.id === taskId)
      ?? Object.values(backlogs).flat().find((task) => task.id === taskId)
      ?? null;
  };

  /**
   * Where a task lives once it has changed: the board, a project's backlog, or neither.
   *
   * A task with no week and a project is a backlog task, and everything else the board can show
   * is a board task — so one write can move a task from one list to the other, and both lists
   * have to be told. Every mutation below routes through here rather than calling `setTasks`
   * with its own idea of the rules, which is how a task dragged into a project used to stay in
   * the Some day column as well as appearing in the drawer.
   */
  const isBacklogTask = (task: Task): boolean => (
    task.taskType === "someday" && task.belongsToProject
  );

  const applyTaskChanges = (updated: Task[]) => {
    if (updated.length === 0) {
      return;
    }

    const byId = new Map(updated.map((task) => [task.id, task]));

    setTasks((prevTasks) => {
      const merged = prevTasks
        .map((prevTask) => byId.get(prevTask.id) ?? prevTask)
        .filter((task) => !isBacklogTask(task));

      const added = updated.filter((task) => (
        !isBacklogTask(task)
        && !prevTasks.some((prev) => prev.id === task.id)
        && (task.taskType === "someday" || (task as WeeklyTask).weekCode === currentWeek)
      ));

      return [...merged, ...added];
    });

    setBacklogs((prevBacklogs) => {
      const next: Record<string, Task[]> = {};

      // Dropped from every list first: a task that changed project must not be left behind in
      // the one it came from.
      Object.entries(prevBacklogs).forEach(([projectId, list]) => {
        next[projectId] = list.filter((task) => !byId.has(task.id));
      });

      updated.filter(isBacklogTask).forEach((task) => {
        const projectId = task.projectId as string;

        // A backlog nobody has opened is not filled in here: it is fetched whole when it is.
        if (next[projectId] === undefined) {
          return;
        }

        next[projectId] = [...next[projectId], task].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });

      return next;
    });
  };

  const loadBacklog = useCallback(async (projectId: string): Promise<void> => {
    if (!projectStore) {
      return;
    }

    const backlog = await projectStore.backlog(projectId);
    setBacklogs((prev) => ({ ...prev, [projectId]: backlog }));
  }, [projectStore]);

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
      // A project's backlog is ordered on its own, not against the board's Some day list.
      const siblings = task.belongsToProject
        ? (backlogs[task.projectId as string] ?? [])
        : tasks.filter((t) => t instanceof SomedayTask);
      task.order = task.order ?? siblings.length;
    }

    taskStore.create(task).then((t) => {
      applyTaskChanges([t]);
    });
  };

  const updateTask = (task: Task) => {
    if (!taskStore) {
      return;
    }
    taskStore.update(task).then((updatedTask) => {
      applyTaskChanges([updatedTask]);
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
      applyTaskChanges([...byId.values()]);
    });
  };

  /**
   * Send a task to a project's backlog.
   *
   * The same upsert every other move is: the task keeps its id, loses its week, and gains the
   * project. It also takes the project's category when the project has one — that is the rule
   * the backend enforces anyway (a project's category is the authority for its tasks), and
   * waiting for a pull to show it would mean a task that changes colour a second after landing.
   */
  const moveTaskToProject = async (task: Task, projectId: string): Promise<void> => {
    if (!taskStore) {
      return;
    }

    const project = projects.find((candidate) => candidate.id === projectId) ?? null;

    const moved = new SomedayTask({
      ...task,
      projectId,
      categoryId: project?.categoryId ?? task.categoryId,
    });

    moved.order = await taskStore.nextBacklogOrder(projectId);

    const stored = await taskStore.update(moved);

    dropLeftover(stored.id);
    applyTaskChanges([stored]);
  };

  const completeTask = (task: Task) => {
    task.completedAt = dayjs();
    updateTask(task);
    dropLeftover(task.id);
  };

  const uncompleteTask = (task: Task) => {
    task.completedAt = null;
    updateTask(task);

    // Unticking a task in a week that has ended makes it outstanding again — the badge would
    // otherwise stay one short until the next reload.
    const weekly = task instanceof WeeklyTask ? task : null;

    if (weekly && weekly.weekCode < thisWeek) {
      setLeftovers((previous) => (
        previous.some((leftover) => leftover.id === weekly.id) ? previous : [...previous, weekly]
      ));
    }
  };

  const deleteTask = (task: Task) => {
    if (!taskStore) {
      return;
    }
    taskStore.delete(task).then(() => {
      setTasks((prevTasks) => prevTasks.filter((prevTask) => prevTask.id !== task.id));
      setBacklogs((prevBacklogs) => Object.fromEntries(
        Object.entries(prevBacklogs)
          .map(([projectId, list]) => [projectId, list.filter((t) => t.id !== task.id)]),
      ));
    });

    dropLeftover(task.id);
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

  /**
   * Move a task out of the week it was left behind in.
   *
   * Not `moveTask`: that one re-indexes the siblings a drag displaced, and works from `tasks`,
   * which only ever holds the week being viewed. A leftover is by definition somewhere else, so
   * it lands at the end of its destination and nothing else has to shift.
   *
   * The board keeps it only if it landed in the week on screen — including the case where the
   * week on screen is the one the task just left.
   */
  const relocateTask = async (task: Task, target: TaskLocation): Promise<void> => {
    if (!taskStore) {
      return;
    }

    // Same id either way: a move is an upsert, never a delete and a create, or the task would
    // lose the history that explains where it has been.
    const moved = target.weekCode === null
      ? new SomedayTask({ ...task })
      : new WeeklyTask({ ...task, weekCode: target.weekCode, dayOfWeek: target.dayOfWeek ?? "0" });

    moved.order = await taskStore.nextOrder(target.weekCode, target.dayOfWeek);

    const stored = await taskStore.update(moved);

    dropLeftover(stored.id);
    applyTaskChanges([stored]);
  };

  const rescueTask = (task: Task, destination: RescueDestination): Promise<void> => {
    if (destination === "someday") {
      return relocateTask(task, { weekCode: null, dayOfWeek: null });
    }

    return relocateTask(task, {
      weekCode: thisWeek,
      dayOfWeek: destination === "thisWeek" ? "0" : ((task as WeeklyTask).dayOfWeek ?? "0"),
    });
  };

  /**
   * Copy a task into the same place, ready to be done again.
   *
   * The copy is unfinished and its subtasks are unticked whatever the original's state: a task is
   * duplicated in order to repeat the work, and a copy that arrives already crossed off would
   * have to be undone by hand before it was any use.
   */
  const duplicateTask = async (task: Task): Promise<void> => {
    if (!taskStore) {
      return;
    }

    const weekly = task instanceof WeeklyTask ? task : null;
    const fields = {
      ...task,
      id: newId(),
      completedAt: null,
      createdAt: null,
      updatedAt: null,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: false })),
    };

    const copy = weekly
      ? new WeeklyTask({ ...fields, weekCode: weekly.weekCode, dayOfWeek: weekly.dayOfWeek })
      : new SomedayTask(fields);

    copy.order = !weekly && task.belongsToProject
      ? await taskStore.nextBacklogOrder(task.projectId as string)
      : await taskStore.nextOrder(weekly ? weekly.weekCode : null, weekly ? weekly.dayOfWeek : null);

    const stored = await taskStore.create(copy);

    applyTaskChanges([stored]);
  };

  const memoizedTasks = useMemo(() => {
    return tasks
      .filter(t => matchesCategorySelection(t.categoryId, selectedCategories))
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
      .filter(e => matchesCategorySelection(e.categoryId, selectedCategories))
      .sort((a, b) => {
        return dayjs(a.startHour).isBefore(dayjs(b.startHour)) ? -1 : 1;
      });
  }, [events, selectedCategories]);

  return (
    <DataContext.Provider
      value={{
        tasks: memoizedTasks,
        allTasks: tasks,
        findTask,
        addTask,
        updateTask,
        completeTask,
        uncompleteTask,
        moveTask,
        rescueTask,
        relocateTask,
        duplicateTask,
        leftovers,
        leftoversLoaded,
        refreshLeftovers,
        deleteTask,
        events: memoizedEvents,
        categories,
        selectedCategories,
        setSelectedCategories,
        focusedCategory,
        focusCategory,
        toggleFocusCategory,
        clearFocus,
        taskStore,
        categoryStore,
        saveCategory,
        deleteCategory,
        noteStore,
        historyAdapter,
        projectStore,
        projects,
        saveProject,
        deleteProject,
        backlogs,
        loadBacklog,
        moveTaskToProject,
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
