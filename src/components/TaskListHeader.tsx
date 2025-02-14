import React, { useContext, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@nextui-org/react";

import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { DataContext } from "../contexts/DataContext";
import { WeekTaskList } from "../types";
import IconButton from "./IconButton";
import { Plus } from "lucide-react";

dayjs.extend(isoWeek);

interface TaskListHeaderProps {
  title: string;
  dayNumber: keyof WeekTaskList;
  weekNumber: number;
}

interface TaskItem {
  title: string;
  category: number | null;
  description: string;
}

const defaultFormData: TaskItem = {
  title: "",
  category: null,
  description: "",
};

const TaskListHeader: React.FC<TaskListHeaderProps> = ({ title, dayNumber, weekNumber }) => {
  const { addTask, categoryList } = useContext(DataContext);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newTask, setNewTask] = useState<TaskItem>(defaultFormData);

  const handleAddTask = () => {
    addTask(dayNumber, newTask);
    setNewTask(defaultFormData);
    onOpenChange(); // Fermer la modale
  };

  return (
    <div className="border-b rounded">
      <div className="px-2 py-1 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {title}
        </h2>
        <IconButton icon={<Plus />} onClick={onOpen} small />
      </div>

      {/* Modale pour ajouter une nouvelle tâche */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Add New Task</ModalHeader>
              <ModalBody>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddTask();
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={newTask.title}
                    onChange={(e) =>
                      setNewTask({ ...newTask, title: e.target.value })
                    }
                    className="border p-2 w-full"
                    required
                  />
                  <select
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        category:
                          e.target.value.length === 0
                            ? null
                            : parseInt(e.target.value, 10),
                      })
                    }
                    className="border p-2 w-full"
                  >
                    <option value="" selected={newTask.category === null}>
                      All
                    </option>
                    {categoryList.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                        selected={category.id === newTask.category}
                      >
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    placeholder="Description"
                    value={newTask.description}
                    onChange={(e) =>
                      setNewTask({ ...newTask, description: e.target.value })
                    }
                    className="border p-2 w-full"
                  />
                  <Button type="submit" color="primary" className="w-full">
                    Save Task
                  </Button>
                </form>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TaskListHeader;
