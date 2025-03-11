import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button, Input, Select, SelectItem, SharedSelection, Textarea } from "@heroui/react";
import Task from "../data/task";
import { useData } from "./DataContext";
import { DayOfWeek } from "../types";
import clsx from "clsx";

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

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {task && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <Input
                  label="Task"
                  placeholder="Buy food"
                  value={data.title}
                  onValueChange={updateField('title')}
                />
              </ModalHeader>
              <ModalBody>
                <Textarea
                  label="Description"
                  placeholder="Carrots, Onions, Potatoes, ..."
                  value={data.description}
                  onValueChange={updateField('description')}
                />
                <Select
                  label="Category"
                  placeholder="None"
                  selectedKeys={data.categoryId !== null ? [`${data.categoryId}`] : []}
                  onSelectionChange={updateField('categoryId')}
                  disallowEmptySelection={false}
                >
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      startContent={<div className={clsx("w-6 h-6 rounded-full", category.getColorClass("bg"))}></div>}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="warning" variant="light" onPress={onOpenChange}>
                  Close
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={handleDeleteTask}
                >
                  Delete
                </Button>
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
