import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Description,
  Modal,
  Select,
  TextField,
  useOverlayState,
} from "@heroui/react";
import type { Key } from "react-aria-components";
import Task, { SomedayTask, WeeklyTask } from "../data/task";
import { useData } from "./DataContext";
import { DayOfWeek } from "../types";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import TaskActivity from "../components/TaskActivity";
import SubtaskEditor from "../components/SubtaskEditor";
import DescriptionEditor from "../components/DescriptionEditor";
import EstimatePicker from "../components/EstimatePicker";
import ReminderPicker from "../components/ReminderPicker";
import TaskMenu from "../components/TaskMenu";
import { useVerticalLayout } from "../utils/layout";
import { Check, X } from "lucide-react";

/** A field's name in the editor: small, heavy and secondary, so the values are what is read. */
const FIELD_LABEL_CLASS = "text-xs font-semibold text-wp-fg-secondary";

/** How long typing may pause before an existing task's edits are saved. */
const AUTOSAVE_DELAY = 700;

/** The fields of `next` that differ from `previous`. */
const changedFields = (previous: Record<string, any>, next: Record<string, any>): Record<string, any> =>
  Object.fromEntries(
    Object.entries(next).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(previous[field])),
  );

interface TaskModalContextProps {
  task: Task | null;
  isOpen: boolean;
  open: (task: Task) => void;
  openNewTask: (weekCode: string, dayOfWeek: DayOfWeek) => void;
}

const TaskModalContext = createContext<TaskModalContextProps | undefined>(
  undefined
);

const TaskModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [mode, setMode] = useState<"CREATE" | "EDIT" | null>(null);
  const { t } = useTranslation();
  const { addTask, updateTask, categories, projects } = useData();
  const vertical = useVerticalLayout();
  const overlay = useOverlayState();
  const { isOpen } = overlay;
  /** What the editor last wrote to the task, so a save carries only what changed since. */
  const saved = useRef<Record<string, any>>({});

  const open = (task: Task) => {
    const serialized = task.serialize();
    setTask(task);
    setData(serialized);
    saved.current = serialized;
    setMode("EDIT");
    overlay.open();
  };

  const openNewTask = (weekCode: string, dayOfWeek: DayOfWeek) => {
    const newTask = Task.create(dayOfWeek === "someday" ? "someday" : "weekly", { title: "", weekCode, dayOfWeek });
    if (newTask) {
      setTask(newTask);
      setData(newTask.serialize());
      setMode("CREATE");
      overlay.open();
    }
  };

  const reset = () => {
    setData({});
    setTask(null);
    setMode(null);
  }

  /*
   * An existing task saves as it is edited: a short pause after typing, and on the way out.
   *
   * Only the fields changed since the last save are written, never the whole form. The ⋮ menu
   * can move or delete the task while the editor is open, and a form snapshot written after a
   * move would put the task back on the day it was opened on. A title emptied on the way to a
   * new one is not saved — the rest of the change is.
   *
   * A new task still waits for its Save button: saving as you type would create one, and an
   * editor closed half-way would leave an untitled task behind.
   */
  const persist = (current: Record<string, any>) => {
    if (!task || mode !== "EDIT") {
      return;
    }

    const changes = changedFields(saved.current, current);

    if ("title" in changes && !`${changes.title ?? ""}`.trim()) {
      delete changes.title;
    }

    if (Object.keys(changes).length === 0) {
      return;
    }

    task.update(changes);
    updateTask(task);
    saved.current = { ...saved.current, ...changes };
  };

  useEffect(() => {
    if (mode !== "EDIT") {
      return;
    }

    const timeout = setTimeout(() => persist(data), AUTOSAVE_DELAY);

    return () => clearTimeout(timeout);
  }, [data]);

  // Closed by the backdrop or Escape rather than by a button of ours: what was typed is kept.
  useEffect(() => {
    if (!isOpen && mode === "EDIT") {
      persist(data);
      reset();
    }
  }, [isOpen]);

  const updateField = (field: keyof Task) => (value: string | Key | null) => {
    let transformedValue;
    if (field === 'categoryId') {
      // One key, or null when cleared. v2 handed over a Set here and this had to reach inside it;
      // v3's single-selection Select gives the key itself.
      //
      // Whatever arrives is stringified rather than parsed. This used to `parseInt` the result,
      // from when category ids were autoincrement integers. They have been UUIDs since contract
      // v1, and `parseInt('01930000-...')` does not fail — it returns 1930, so picking a category
      // silently wrote a garbage id that matched nothing.
      transformedValue = value !== null && value !== undefined ? `${value}` : null;
    } else {
      transformedValue = value;
    }
    setData(prevData => ({ ...prevData, [field]: transformedValue }));
  }

  /** Adds a new task. An existing one has already saved itself. */
  const saveTask = () => {
    if (!task) {
      return;
    }
    task.update(data);
    addTask(task as WeeklyTask | SomedayTask);
    overlay.close();
    reset();
  }

  /** Closes the editor, keeping an existing task's edits and dropping a new task. */
  const closeTask = () => {
    persist(data);
    overlay.close();
    reset();
  };

  /** Closes after a ⋮ menu action, which saved the edits first and may have deleted the task. */
  const dismissTask = () => {
    overlay.close();
    reset();
  };

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      {/* No `Modal.CloseTrigger`: that is how v3 spells the old `hideCloseButton`. */}
      <Modal state={overlay}>
        <Modal.Backdrop variant="blur">
        <Modal.Container size="lg">
        {/* A sheet on a phone — pinned to the bottom edge, rounded only at the top, with a
            grabber — and a card everywhere else. The container's own inset is what would leave a
            gap under the sheet, so it is cancelled at that width. */}
        <Modal.Dialog className="max-w-[560px] p-0 overflow-hidden max-sm:-mb-4 max-sm:-mx-4 max-sm:w-screen max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[20px] max-sm:border-b-0 max-sm:max-h-[92dvh]">
          {task && (
            <>
              <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
                <span className="h-1 w-9 rounded-sm bg-wp-border-strong" />
              </div>
              <Modal.Header className="flex-row items-center justify-between gap-1 py-2 pr-3 pl-5 sm:pt-4">
                <Modal.Heading>{t('actions.edit_task')}</Modal.Heading>
                <div className="flex items-center gap-1">
                  {/* Not in CREATE mode: there is nothing yet to move, copy or delete. Not on the
                      vertical layout either, where the row this modal was opened from carries the
                      same menu — two menus for one task is a question about which one differs. */}
                  {mode === "EDIT" && !vertical && (
                    <TaskMenu task={task} labelled onBeforeAction={() => persist(data)} onAction={dismissTask} />
                  )}
                  <button
                    type="button"
                    onClick={closeTask}
                    aria-label={t('actions.close')}
                    className="flex size-8 items-center justify-center rounded-full bg-wp-track text-wp-fg-secondary cursor-pointer hover:text-wp-fg focus-visible:outline-2 focus-visible:outline-wp-accent"
                  >
                    <X size={16} />
                  </button>
                </div>
              </Modal.Header>
              <Modal.Body className="m-0 mt-0 flex flex-col gap-4 px-5 pt-1.5 pb-4 overflow-y-auto">
                <TextField value={data.title} onChange={updateField('title')} className="gap-1.5">
                  <Label className={FIELD_LABEL_CLASS}>{t('task.title')}</Label>
                  <Input
                    placeholder={t('task.placeholder.title')}
                    className="h-[42px] text-[15px] font-semibold"
                  />
                </TextField>
                {/* Markdown, written in a textarea with a toolbar rather than in a WYSIWYG
                    surface — see `DescriptionEditor` for the measurement that decided it. What is
                    stored is still a plain string, so nothing downstream of here changed: the
                    column, the per-field LWW, the export and the CSV import all carry on. */}
                <DescriptionEditor
                  value={data.description ?? ''}
                  onChange={(next) => updateField('description')(next)}
                  label={t('task.description')}
                  placeholder={t('task.placeholder.description')}
                />
                {/* Side by side: two short pickers that are read together — a project decides
                    the category, so the one explains the other being greyed out. */}
                <div className="grid grid-cols-2 gap-2.5">
                <Select
                  className="min-w-0 gap-1.5"
                  placeholder={t('task.placeholder.project')}
                  value={data.projectId ? `${data.projectId}` : null}
                  onChange={(key: Key | null) => {
                    const projectId = key === null ? null : String(key);
                    const project = projects.find((p) => p.id === projectId);

                    // A project owns the category of everything in it, so picking one replaces
                    // the task's category rather than sitting beside it. The backend enforces
                    // the same rule on write; mirroring it here keeps the form honest instead of
                    // showing a category that is about to be overwritten.
                    setData(prev => ({
                      ...prev,
                      projectId,
                      categoryId: project ? project.categoryId : prev.categoryId,
                    }));
                  }}
                >
                  <Label className={FIELD_LABEL_CLASS}>{t('task.project')}</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {projects.map(project => (
                        <ListBox.Item key={project.id} id={project.id} textValue={project.name}>
                          <Label>{project.name}</Label>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <Select
                  className="min-w-0 gap-1.5"
                  placeholder={t('task.placeholder.category')}
                  value={data.categoryId ? `${data.categoryId}` : null}
                  onChange={updateField('categoryId')}
                  isDisabled={!!data.projectId}
                >
                  <Label className={FIELD_LABEL_CLASS}>{t('task.category')}</Label>
                  <Select.Trigger>
                    {/* `.select__value` is `flex-1` but not a flex container, so an item that
                        renders a swatch beside its name stacks the two. */}
                    <Select.Value className="flex items-center gap-2" />
                    <Select.Indicator />
                  </Select.Trigger>
                  {data.projectId && <Description>{t('task.category_from_project')}</Description>}
                  <Select.Popover>
                    <ListBox>
                      {categories.map(category => (
                        <ListBox.Item key={category.id} id={category.id} textValue={category.name}>
                          <span className={clsx("size-2.5 shrink-0 rounded-full", category.getColorClass("bg"))} />
                          <Label>{category.name}</Label>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                </div>

                {/* Between the category and the subtasks: it is a fact about the whole task, so
                    it belongs above the list of its parts. */}
                <EstimatePicker
                  value={data.estimatedMinutes ?? null}
                  onChange={(minutes) => setData(prev => ({ ...prev, estimatedMinutes: minutes }))}
                />

                {/* Under the estimate: another fact about when the task gets done. Kept on a task
                    moved off its day, and offered again once it is back on one. */}
                <ReminderPicker
                  value={data.reminderTime ?? null}
                  onChange={(reminderTime) => setData(prev => ({ ...prev, reminderTime }))}
                  hasDay={task instanceof WeeklyTask && `${task.dayOfWeek}` !== "0"}
                />

                <SubtaskEditor
                    subtasks={data.subtasks ?? []}
                    onChange={(subtasks) => setData(prev => ({ ...prev, subtasks }))}
                />

                {/* Only once the task exists. In CREATE mode there is nothing to attach a note
                    to and no history to show — the record reaches the backend on save. */}
                {mode === "EDIT" && (
                  <TaskActivity task={task} />
                )}
              </Modal.Body>
              <Modal.Footer className="mt-0 gap-2.5 border-t border-wp-border px-5 pt-3 pb-[22px] sm:pb-4">
                {mode === "EDIT" ? (
                  <>
                    <span className="flex flex-1 items-center gap-1.5 text-xs font-medium text-wp-muted">
                      <Check size={14} aria-hidden="true" />
                      {t('task.autosaved')}
                    </span>
                    <Button variant="secondary" onPress={closeTask}>
                      {t('actions.close')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" className="flex-1" onPress={closeTask}>
                      {t('actions.cancel')}
                    </Button>
                    <Button variant="primary" className="flex-1" onPress={saveTask}>
                      {t('actions.save')}
                    </Button>
                  </>
                )}
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
        </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </TaskModalContext.Provider>
  );
};

const useTaskModal = () => {
  const context = useContext(TaskModalContext);
  if (!context) {
    throw new Error("useTaskModal must be used within a TaskModalProvider");
  }
  return context;
};

export { TaskModalContext, TaskModalProvider, useTaskModal };
