import React, { useContext, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DataContext } from "../contexts/DataContext";
import { Task, WeekTaskList } from "../types";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from "@nextui-org/react";

interface DraggableTaskProps {
  task: Task;
  dayNumber: keyof WeekTaskList;
}

const DraggableTask: React.FC<DraggableTaskProps> = ({ task, dayNumber }) => {
  const { tasks, completeTask, uncompleteTask, deleteTask, categoryList } =
    useContext(DataContext);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    onOpen();
  };

  const handleDeleteTask = () => {
    if (selectedTask) {
      deleteTask(dayNumber, selectedTask.id);
      setSelectedTask(null);
      onOpenChange();
    }
  };
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: "task-" + task.id,
    animateLayoutChanges: ({ isSorting }) => (isSorting ? false : true),
    // Active une animation douce lors de la réorganisation
    data: {
      type: "task",
      id: task.id,
      currentOrder: task.order,
      dayNumber,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1, // Effet semi-transparent lors du drag
    boxShadow: isDragging ? "0px 4px 10px rgba(0,0,0,0.2)" : "none", // Ombre pour effet de levitation
  };

  return (
    <>
      <li
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="p-4 border rounded-lg mb-2"
      >
        <h3 className="text-md font-medium">{task.title}</h3>
        <p>
          <strong>Category:</strong>
          {task.category === null
            ? "Ø"
            : categoryList.find((c) => c.id === task.category)?.label ?? "Ø"}
        </p>
        <label className="flex items-center space-x-2">
          <span>Done:</span>
          <input
            type="checkbox"
            checked={task.completed_at !== null}
            onChange={(e) => {
              e.target.checked
                ? completeTask(dayNumber, task.id)
                : uncompleteTask(dayNumber, task.id);
            }}
            className="cursor-pointer"
          />
        </label>
        <Button
          onPress={() => openTaskDetails(task)}
          className="mt-2"
          color="primary"
        >
          View Details
        </Button>
      </li>
      {/* Modale pour afficher les détails de la tâche */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {selectedTask && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedTask.title}
              </ModalHeader>
              <ModalBody>
                <p>
                  <strong>Description:</strong> {selectedTask.description}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {selectedTask.completed_at !== null
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
    </>
  );
};

export default DraggableTask;
