import { Button, useDisclosure } from "@nextui-org/react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import React, { createContext, ReactNode, useContext, useState } from "react";
import Task from "../data/task";
import { useData } from "./DataContext";

interface TaskModalContextProps {
  task: Task | null;
  isOpen: boolean;
  open: (task: Task) => void;
}

const TaskModalContext = createContext<TaskModalContextProps | undefined>(
  undefined
);

const TaskModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [task, setTask] = useState<Task | null>(null);
  const { deleteTask } = useData();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const open = (task: Task) => {
    setTask(task);
    onOpen();
  };

  const handleDeleteTask = () => {
    if (task) {
      deleteTask(task);
      setTask(null);
      onOpenChange();
    }
  };

  return (
    <TaskModalContext.Provider value={{ task, isOpen, open }}>
      {children}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {task && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {task.title}
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
