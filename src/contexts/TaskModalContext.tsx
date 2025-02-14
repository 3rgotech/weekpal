import { Button, useDisclosure } from "@nextui-org/react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import React, { createContext, ReactNode, useState } from "react";
import { Task } from "../types";

interface TaskModalContextProps {
  task: Task;
  isOpen: boolean;
  open: (task: Task) => void;
}

const TaskModalContext = createContext<TaskModalContextProps | undefined>(
  undefined
);

const TaskModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [task, setTask] = useState<Task | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const open = (task: Task) => {
    setTask(task);
    onOpen();
  };

  const handleDeleteTask = () => {
    // TODO : wire delete
    // if (selectedTask) {
    //   deleteTask(dayNumber, selectedTask.id);
    //   setSelectedTask(null);
    //   onOpenChange();
    // }
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
                  {task.completed_at !== null
                    ? "Completed"
                    : "Not Completed"}
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

export { TaskModalContext, TaskModalProvider };
