import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger, Input, Select, SelectItem, SharedSelection, Textarea } from "@heroui/react";
import Task from "../data/task";
import { useData } from "./DataContext";
import { DayOfWeek } from "../types";
import clsx from "clsx";
import IconButton from "../components/IconButton";
import { Copy, EllipsisVertical, SquareArrowDownLeft, SquareArrowDownRight, SquareArrowRight, SquareArrowUpRight, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { addTask, updateTask, deleteTask, categories } = useData();
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();

  const open = (task: Task) => {
    setTask(task);
    setData(task.serialize());
    setMode("EDIT");
    onOpen();
  };

  const openNewTask = (weekCode: string, dayOfWeek: DayOfWeek) => {
    const newTask = new Task({ title: "", weekCode, dayOfWeek });
    setTask(newTask);
    setData(newTask.serialize());
    setMode("CREATE");
    onOpen();
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

  const handleDeleteTask = () => {
    if (task) {
      deleteTask(task);
      setTask(null);
      onOpenChange();
    }
  };

  const updateField = (field: keyof Task) => (value: string | SharedSelection) => {
    let transformedValue;
    if (field === 'categoryId') {
      transformedValue = [...value][0] ?? null;
      transformedValue = transformedValue !== null ? parseInt(`${transformedValue}`, 10) : null;
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
      addTask(task);
    }
    if (mode === "EDIT") {
      updateTask(task);
    }
    onClose();
    reset();
  }

  const taskToolbar = (
    <div className="flex flex-row gap-1">
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <button className="p-0.5">
            <EllipsisVertical size={16} />
          </button>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownSection title="Move task to">
            {/* TODO : move task to today if task is not on today, to tomorrow if task is on today */}
            <DropdownItem
              key="move_to_tomorrow"
              endContent={<SquareArrowRight size={12} />}
            >
              <span>Tomorrow</span>
            </DropdownItem>
            <DropdownItem
              key="move_to_next_monday"
              endContent={<SquareArrowUpRight size={12} />}
            >
              <span>Next Monday</span>
            </DropdownItem>
            <DropdownItem
              key="move_to_next_week"
              endContent={<SquareArrowUpRight size={12} />}
            >
              <span>Next Week (same day)</span>
            </DropdownItem>
            <DropdownItem
              key="move_to_this_week"
              endContent={<SquareArrowDownLeft size={12} />}
            >
              <span>This week</span>
            </DropdownItem>
            <DropdownItem
              key="move_to_someday"
              endContent={<SquareArrowDownRight size={12} />}
            >
              <span>Some day</span>
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Actions">
            <DropdownItem key="duplicate" endContent={<Copy size={12} />}>
              <span>Duplicate</span>
            </DropdownItem>
            <DropdownItem
              key="Delete"
              color="danger"
              classNames={{
                base: "text-red-700",
                description: "text-red-700",
              }}
              endContent={<Trash size={12} />}
              onPress={() => {
                handleDeleteTask();
                onOpenChange();
              }}
            >
              Delete
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>
    </div>
  );

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size={"2xl"} hideCloseButton>
        <ModalContent>
          {task && (
            <>
              <ModalHeader className="flex flex-row justify-between items-center gap-1">
                <span className="text-lg font-bold">{t('actions.edit_task')}</span>
                {taskToolbar}
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
                  label={t('task.category')}
                  placeholder={t('task.placeholder.category')}
                  selectedKeys={data.categoryId !== null ? [`${data.categoryId}`] : []}
                  onSelectionChange={updateField('categoryId')}
                  disallowEmptySelection={false}
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
              </ModalBody>
              <ModalFooter>
                {/* TODO : save on change */}
                <Button
                  color="primary"
                  variant="solid"
                  onPress={saveTask}
                >
                  Save
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
