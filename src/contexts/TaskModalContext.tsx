import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Description,
  Modal,
  Select,
  TextArea,
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
import TaskMenu from "../components/TaskMenu";
import { useVerticalLayout } from "../utils/layout";

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

  const open = (task: Task) => {
    setTask(task);
    setData(task.serialize());
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

  useEffect(() => {
    // Throttle the data update to avoid too many re-renders
    // TODO : store updated task
    // const timeout = setTimeout(() => {
    //   console.log('data updated', data);
    // }, 500);

    // return () => clearTimeout(timeout);
  }, [data]);

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

  const saveTask = () => {
    if (!task) {
      return;
    }
    task.update(data);
    if (mode === "CREATE") {
      addTask(task as WeeklyTask | SomedayTask);
    }
    if (mode === "EDIT") {
      updateTask(task);
    }
    overlay.close();
    reset();
  }

  const closeTask = () => {
    overlay.close();
    reset();
  };

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      {/* No `Modal.CloseTrigger`: that is how v3 spells the old `hideCloseButton`. */}
      <Modal state={overlay}>
        <Modal.Backdrop>
        <Modal.Container size="lg">
        <Modal.Dialog>
          {task && (
            <>
              <Modal.Header className="flex flex-row justify-between items-center gap-1">
                <Modal.Heading className="text-lg font-bold">{t('actions.edit_task')}</Modal.Heading>
                {/* Not in CREATE mode: there is nothing yet to move, copy or delete. Not on the
                    vertical layout either, where the row this modal was opened from carries the
                    same menu — two ⋮ for one task is a question about which one differs. */}
                {mode === "EDIT" && !vertical && (
                  <TaskMenu task={task} onAction={closeTask} />
                )}
              </Modal.Header>
              <Modal.Body>
                <TextField value={data.title} onChange={updateField('title')}>
                  <Label>{t('task.title')}</Label>
                  <Input placeholder={t('task.placeholder.title')} />
                </TextField>
                <TextField value={data.description} onChange={updateField('description')}>
                  <Label>{t('task.description')}</Label>
                  <TextArea placeholder={t('task.placeholder.description')} />
                </TextField>
                <Select
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
                  <Label>{t('task.project')}</Label>
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
                  placeholder={t('task.placeholder.category')}
                  value={data.categoryId ? `${data.categoryId}` : null}
                  onChange={updateField('categoryId')}
                  isDisabled={!!data.projectId}
                >
                  <Label>{t('task.category')}</Label>
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
                          <div className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}></div>
                          <Label>{category.name}</Label>
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <SubtaskEditor
                    subtasks={data.subtasks ?? []}
                    onChange={(subtasks) => setData(prev => ({ ...prev, subtasks }))}
                />

                {/* Only once the task exists. In CREATE mode there is nothing to attach a note
                    to and no history to show — the record reaches the backend on save. */}
                {mode === "EDIT" && (
                  <div className="mt-2 border-t border-slate-200 dark:border-slate-600 pt-2">
                    <TaskActivity task={task} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                {/* TODO : save on change */}
                <Button variant="primary" onPress={saveTask}>
                  {t('actions.save')}
                </Button>
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
