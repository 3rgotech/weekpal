import Category from "../data/category";
import Event from "../data/event";
import Task, { SomedayTask, WeeklyTask } from "../data/task";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "fr";

export interface Settings {
  theme: Theme;
  language: Language;
  dayHeaderFormat: string;
  weekHeaderFormat: string;
  showCompletedTasks: boolean;
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
  currentWeekNumber: number; // Ajout de la propriété manquante
}

export type CategoryColor = "red" | "orange" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose";

/**
 * STORES (local storage)
 */
export interface ITaskStore {
  list(weekCode: string): Promise<Task[]>;
  reload(task: Task | number): Promise<Task | null>;
  create(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  delete(task: Task): Promise<void>;
}

export interface IEventStore {
  list(weekCode: string): Promise<Event[]>;
  reload(event: Event | number): Promise<Event | null>;
}

export interface ICategoryStore {
  list(): Promise<Category[]>;
  reload(category: Category | number): Promise<Category | null>;
  create(category: Category): Promise<Category>;
  update(category: Category): Promise<Category>;
  delete(category: Category): Promise<void>;
}

/**
 * ADAPTERS (backend storage)
 */

export interface APIWeekTasklistResponse { weeklyTasks: WeeklyTask[], somedayTasks: SomedayTask[] }

export interface ITaskAdapter {
  getWeek(weekCode: string): Promise<APIWeekTasklistResponse>;
  create(task: Task): Promise<number>;
  update(task: Task): Promise<void>;
  delete(task: Task): Promise<void>;
}

export interface IEventAdapter {
  getWeek(weekCode: string): Promise<Event[]>;
}

export interface ICategoryAdapter {
  list(): Promise<Category[]>;
  create(category: Category): Promise<number>;
  update(category: Category): Promise<void>;
  delete(category: Category): Promise<void>;
}
