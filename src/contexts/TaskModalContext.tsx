import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button, Input } from "@heroui/react";
import Task from "../data/task";
import { useData } from "./DataContext";

interface TaskModalContextProps {
  task: Task | null;
  isOpen: boolean;
  open: (task: Task) => void;
  openNewTask: () => void;
}

const TaskModalContext = createContext<TaskModalContextProps | undefined>(
  undefined
);

const TaskModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const { deleteTask } = useData();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const open = (task: Task) => {
    setTask(task);
    setData(task.serialize());
    onOpen();
  };

  const openNewTask = () => {
    setTask(new Task({ title: "" }));
    onOpen();
  };

  useEffect(() => {
    // Throttle the data update to avoid too many re-renders
    const timeout = setTimeout(() => {
      console.log('data updated', data);
      // TODO : store updated task
    }, 500);

    return () => clearTimeout(timeout);
  }, [data]);

  const handleDeleteTask = () => {
    if (task) {
      deleteTask(task);
      setTask(null);
      onOpenChange();
    }
  };

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open, openNewTask }}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {task && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <Input label="Task" placeholder="Buy food" value={data.title} onValueChange={(value) => {
                  setData(prevData => ({ ...prevData, title: value }));
                }} />
              </ModalHeader>
              <ModalBody>
                <p>
                  <strong>Description:</strong> {task.description}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {task.completed ? "Completed" : "Not Completed"}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onOpenChange}>
                  Close
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={handleDeleteTask}
                >
                  Delete Task
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
