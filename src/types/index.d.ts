export interface Task {
  id: number;
  title: string;
  description: string;
  completed_at: string | null;
  order: number;
  category: string; // Ajout de la propriété manquante
}

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
  tasks: Record<keyof WeekTaskList, Task[]>;
  completeTask: (day: keyof WeekTaskList, taskId: string) => void;
  uncompleteTask: (day: keyof WeekTaskList, taskId: string) => void;
  deleteTask: (day: keyof WeekTaskList, taskId: string) => void;
  currentWeekNumber: number; // Ajout de la propriété manquante
}
