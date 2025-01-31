import React, { useState, useContext } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';
import { DataContext } from '../../contexts/DataContext';
import { Task, WeekTaskList } from '../../types';

interface TaskProps {
  weekNumber: number;
  dayNumber: keyof WeekTaskList;
}

const TaskList: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
  const { tasks, categoryList, completeTask, uncompleteTask, deleteTask } = useContext(DataContext);
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

  // if (!tasks) return null;

  console.log("Task List : day=" + dayNumber + " ; tasks=" + (tasks ? tasks[dayNumber].length : 0));

  return (
    <div>
      <ul>
        {((tasks ? tasks[dayNumber] : null) ?? []).map((task) => (
          <li
            key={task.id}
            className={`p-4 border rounded-lg mb-2 ${task.completed_at !== null ? 'line-through text-gray-500' : ''
              }`}
          >
            <h3 className="text-md font-medium">{task.title}</h3>
            <p>
              <strong>Category:</strong>
              {task.category === null && 'Ø'}
              {task.category !== null && (categoryList.find((c) => c.id === task.category)?.label ?? 'Ø')}
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
            <Button onPress={() => openTaskDetails(task)} className="mt-2" color="primary">
              View Details
            </Button>
          </li>
        ))}
      </ul>

      {/* Modale pour afficher les détails de la tâche */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {selectedTask && (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {selectedTask.title}
              </ModalHeader>
              <ModalBody>
                <p><strong>Description:</strong> {selectedTask.description}</p>
                <p><strong>Status:</strong> {selectedTask.completed_at !== null ? 'Completed' : 'Not Completed'}</p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onOpenChange}>
                  Close
                </Button>
                <Button color="primary" variant="solid" onPress={handleDeleteTask}>
                  Delete Task
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TaskList;
