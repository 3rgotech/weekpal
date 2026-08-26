import Category from "../data/category";
import Event from "../data/event";
import Project from "../data/project";
import Task, { SomedayTask, WeeklyTask } from "../data/task";
import Note from "../data/note";
import HistoryEntry from "../data/history";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "fr";

export type SubtaskDisplay = "percentage" | "number" | "none";

/**
 * One checklist item on a task.
 *
 * Exactly the two fields the API validates (API-CONTRACT.md §4) and no more: subtasks are
 * stored as a JSON array on the task rather than as rows, so they carry no id of their own and
 * are addressed by position.
 */
export interface Subtask {
  title: string;
  completed: boolean;
}

export interface Settings {
  theme: Theme;
  language: Language;
  dayHeaderFormat: string;
  weekHeaderFormat: string;
  showCompletedTasks: boolean;
  showEvents: boolean;
  showWeekend: boolean;
  /** Reconciled with the API in contract §5; no UI reads it yet. */
  subtaskDisplay: SubtaskDisplay;
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
  entityType: 'task' | 'category' | 'project' | 'note';
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
  leftovers(): Promise<WeeklyTask[]>;
  reload(task: Task | string): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(task: Task): Promise<void>;
}

export interface IEventStore {
  list(weekCode: string): Promise<Event[]>;
  reload(event: Event | string): Promise<Event | null>;
}

/**
 * Notes are always read for one task at a time, so every method is task-scoped — there is no
 * "all notes" view in the product and nothing needs one.
 */
export interface INoteStore {
  list(taskId: string): Promise<Note[]>;
  reload(note: Note | string): Promise<Note | null>;
  create(note: Note): Promise<Note>;
  update(note: Note): Promise<Note>;
  delete(note: Note): Promise<void>;
}

export interface IProjectStore {
  list(): Promise<Project[]>;
  reload(project: Project | string): Promise<Project | null>;
  create(project: Project): Promise<Project>;
  update(project: Project): Promise<Project>;
  delete(project: Project): Promise<void>;
  /** A project's unscheduled tasks, which the week payload deliberately excludes. */
  backlog(projectId: string): Promise<Task[]>;
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

/**
 * Unfinished tasks from weeks that have ended, and where that scope starts.
 *
 * `since` is the oldest week the server looked at — the plan's history window. Without it the
 * client could not tell "you have nothing older outstanding" from "your plan hides it", and so
 * could not safely drop the local rows the response leaves out.
 */
export interface LeftoverPayload { tasks: Task[]; since: string }

export interface ITaskAdapter {
  getWeek(weekCode: string): Promise<WeekPayload>;
  /** Everything still outstanding from weeks that have already ended. */
  leftovers(): Promise<LeftoverPayload>;
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

export interface ISettingsAdapter {
  get(): Promise<Settings>;
  /** Partial patch in, complete object out. */
  update(patch: Partial<Settings>): Promise<Settings>;
}

export interface IProjectAdapter {
  list(): Promise<Project[]>;
  upsert(project: Project): Promise<Project>;
  delete(id: string): Promise<void>;
  /** A project's unscheduled tasks, which the week payload deliberately excludes. */
  backlog(projectId: string): Promise<Task[]>;
}

export interface INoteAdapter {
  list(taskId: string): Promise<Note[]>;
  upsert(note: Note): Promise<Note>;
  /** Task-scoped, because the route is: a note id alone does not address a note. */
  delete(taskId: string, id: string): Promise<void>;
}

/**
 * Read-only by design: the changelog is written by the backend from the task writes it already
 * receives, so there is nothing for a client to push.
 */
export interface IHistoryAdapter {
  list(taskId: string): Promise<HistoryEntry[]>;
}
