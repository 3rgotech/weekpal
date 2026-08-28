import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button, Input, Select, SelectItem, SharedSelection, Textarea } from "@heroui/react";
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
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const open = (task: Task) => {
    setTask(task);
    setData(task.serialize());
    setMode("EDIT");
    onOpen();
  };

  const openNewTask = (weekCode: string, dayOfWeek: DayOfWeek) => {
    const newTask = Task.create(dayOfWeek === "someday" ? "someday" : "weekly", { title: "", weekCode, dayOfWeek });
    if (newTask) {
      setTask(newTask);
      setData(newTask.serialize());
      setMode("CREATE");
      onOpen();
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

  const updateField = (field: keyof Task) => (value: string | SharedSelection) => {
    let transformedValue;
    if (field === 'categoryId') {
      // The selection is a Set of keys; take the single one, or null when cleared.
      //
      // This used to `parseInt` the result, from when category ids were autoincrement integers.
      // They have been UUIDs since contract v1, and `parseInt('01930000-...')` does not fail —
      // it returns 1930, so picking a category silently wrote a garbage id that matched nothing.
      transformedValue = [...value][0] ?? null;
      transformedValue = transformedValue !== null ? `${transformedValue}` : null;
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
    onClose();
    reset();
  }

  const closeTask = () => {
    onClose();
    reset();
  };

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size={"2xl"} hideCloseButton>
        <ModalContent>
          {task && (
            <>
              <ModalHeader className="flex flex-row justify-between items-center gap-1 dark:text-white">
                <span className="text-lg font-bold">{t('actions.edit_task')}</span>
                {/* Not in CREATE mode: there is nothing yet to move, copy or delete. Not on the
                    vertical layout either, where the row this modal was opened from carries the
                    same menu — two ⋮ for one task is a question about which one differs. */}
                {mode === "EDIT" && !vertical && (
                  <TaskMenu task={task} onAction={closeTask} />
                )}
              </ModalHeader>
              <ModalBody>
                <Input
                  label={t('task.title')}
                  placeholder={t('task.placeholder.title')}
                  value={data.title}
                  onValueChange={updateField('title')}
                />
                <Textarea
                  label={t('task.description')}
                  placeholder={t('task.placeholder.description')}
                  value={data.description}
                  onValueChange={updateField('description')}
                />
                <Select
                  label={t('task.project')}
                  placeholder={t('task.placeholder.project')}
                  selectedKeys={data.projectId ? [`${data.projectId}`] : []}
                  onSelectionChange={(keys) => {
                    const projectId = ([...keys][0] as string) ?? null;
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
                  disallowEmptySelection={false}
                >
                  {projects.map(project => (
                    <SelectItem key={project.id} className="dark:text-white">
                      {project.name}
                    </SelectItem>
                  ))}
                </Select>

                <Select
                  label={t('task.category')}
                  placeholder={t('task.placeholder.category')}
                  selectedKeys={data.categoryId ? [`${data.categoryId}`] : []}
                  onSelectionChange={updateField('categoryId')}
                  disallowEmptySelection={false}
                  isDisabled={!!data.projectId}
                  description={data.projectId ? t('task.category_from_project') : undefined}
                >
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      startContent={<div className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}></div>}
                      className="dark:text-white"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
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
              </ModalBody>
              <ModalFooter>
                {/* TODO : save on change */}
                <Button
                  color="primary"
                  variant="solid"
                  onPress={saveTask}
                >
                  {t('actions.save')}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
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
