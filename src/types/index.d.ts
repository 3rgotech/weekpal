import Category from "../data/category";
import Event from "../data/event";
import Project from "../data/project";
import Task, { SomedayTask, WeeklyTask } from "../data/task";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "fr";

export interface Settings {
  theme: Theme;
  language: Language;
  dayHeaderFormat: string;
  weekHeaderFormat: string;
  showCompletedTasks: boolean;
  showEvents: boolean;
  showWeekend: boolean;
}

export type DayOfWeek = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "someday";

export interface WeekTaskList {
  // 0 : this week
  "0": Array<Task>,
  // 1-7 : monday to sunday
  "1": Array<Task>,
  "2": Array<Task>,
  "3": Array<Task>,
  "4": Array<Task>,
  "5": Array<Task>,
  "6": Array<Task>,
  "7": Array<Task>,
  // someday
  "someday": Array<Task>,
}

export interface TaskList {
  [weekCode: string]: WeekTaskList;
}

export interface DataContextProps {
  tasks: Record<DayOfWeek, Task[]>;
  completeTask: (day: DayOfWeek, taskId: string) => void;
  uncompleteTask: (day: DayOfWeek, taskId: string) => void;
  deleteTask: (day: DayOfWeek, taskId: string) => void;
  currentWeekNumber: number;
}

export type CategoryColor = "red" | "orange" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose";

/**
 * SYNC
 */

/**
 * One queued write, waiting to reach the backend.
 *
 * `entityId` is the record's UUID, so a queue entry can be matched to the row it describes
 * without a second lookup key. `attempts` and `lastError` exist so a permanently-failing entry
 * can be set aside rather than blocking everything behind it forever.
 */
export interface PendingChange {
  id: string;
  entityType: 'task' | 'category' | 'project';
  entityId: string;
  /**
   * Set when one entry covers several records — a reorder, where the whole affected set has to
   * reach the server together or not at all. `entityId` is the first of them, so an entry can
   * still be matched to a record without special-casing.
   */
  entityIds?: string[];
  type: 'upsert' | 'delete';
  /** Snapshot needed to replay a delete after the local row is gone. */
  data?: Record<string, any>;
  timestamp: number;
  attempts: number;
  lastError?: string;
  /** Set when the failure is permanent; the entry stops being retried. */
  deadLettered?: boolean;
}

/** How the client should react to a failed request (API-CONTRACT.md §6). */
export type SyncFailureKind = 'transient' | 'permanent' | 'conflict' | 'unauthorized' | 'forbidden';

/**
 * STORES (local storage)
 */
export interface ITaskStore {
  list(weekCode: string): Promise<Task[]>;
  reload(task: Task | string): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(task: Task): Promise<void>;
}

export interface IEventStore {
  list(weekCode: string): Promise<Event[]>;
  reload(event: Event | string): Promise<Event | null>;
}

export interface ICategoryStore {
  list(): Promise<Category[]>;
  reload(category: Category | string): Promise<Category | null>;
  create(category: Category): Promise<Category>;
  update(category: Category): Promise<Category>;
  delete(category: Category): Promise<void>;
}

/**
 * ADAPTERS (backend storage)
 *
 * `create` and `update` collapse into `upsert`, because the client owns identity and every
 * write carries a full representation — the backend decides whether that means insert or
 * update. `delete` takes an id rather than an entity, so a queued delete needs no live record.
 */

export interface WeekPayload { tasks: Task[]; events: Event[] }

export interface ITaskAdapter {
  getWeek(weekCode: string): Promise<WeekPayload>;
  upsert(task: Task): Promise<Task>;
  /** Moves and reorders: the whole affected set in one request. */
  upsertMany(tasks: Task[]): Promise<Task[]>;
  delete(id: string): Promise<void>;
}

export interface IEventAdapter {
  getWeek(weekCode: string): Promise<Event[]>;
}

export interface ICategoryAdapter {
  list(): Promise<Category[]>;
  upsert(category: Category): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface IProjectAdapter {
  list(): Promise<Project[]>;
  upsert(project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
  /** A project's unscheduled tasks, which the week payload deliberately excludes. */
  backlog(projectId: string): Promise<Task[]>;
}
