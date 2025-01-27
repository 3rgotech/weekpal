import React, { useState, useEffect, useContext } from 'react';
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

interface TaskItem {
  type: string;
  title: string;
  category: string;
  description: string;
  done: boolean;
}

const LOCAL_STORAGE_KEY = 'tasks';

// Structure par défaut pour initialiser les données
const defaultTaskData = {
  "2025w01": {
    "0": [],
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
    "this_week": [],
  },
  "one_day": [],
};

const TaskList: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
  const { tasks, completeTask, uncompleteTask } = useContext(DataContext);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    // Récupérer les données depuis le localStorage après l'initialisation
    // const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    // const parsedTasks = storedTasks ? JSON.parse(storedTasks) : {};

    // let dayTasks: TaskItem[] = [];

    // if (dayNumber === 7) {
    //   const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;
    //   dayTasks = parsedTasks[weekKey]?.['this_week'] || [];
    // } else if (dayNumber === 8) {
    //   dayTasks = parsedTasks['one_day'] || [];
    // } else {
    //   const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;
    //   dayTasks = parsedTasks[weekKey]?.[dayNumber] || [];
    // }

    // setTasks(dayTasks);
  }, [weekNumber, dayNumber]);

  const handleTaskToggle = (index: number) => {
    // const updatedTasks = tasks.map((task, i) =>
    //   i === index ? { ...task, done: !task.done } : task
    // );
    // setTasks(updatedTasks);

    // Sauvegarder les modifications dans le localStorage
    // const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    // const parsedTasks = storedTasks ? JSON.parse(storedTasks) : {};
    // const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;

    // if (dayNumber === 7) {
    //   parsedTasks[weekKey]['this_week'] = updatedTasks;
    // } else if (dayNumber === 8) {
    //   parsedTasks['one_day'] = updatedTasks;
    // } else {
    //   parsedTasks[weekKey][dayNumber] = updatedTasks;
    // }

    // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedTasks));
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    onOpen();
  };

  if (!tasks) {
    return null;
  }

  return (
    <div>
      <ul>
        {(tasks[dayNumber] ?? []).map((task) => (
          <li
            key={task.id}
            className={`p-4 border rounded-lg mb-2 ${task.completed_at !== null ? 'line-through text-gray-500' : ''
              }`}
          >
            <h3 className="text-md font-medium">{task.title}</h3>

            <label className="flex items-center space-x-2">
              <span>Done:</span>
              <input
                type="checkbox"
                checked={task.completed_at !== null}
                onChange={(e) => {
                  e.target.checked
                    ? completeTask(dayNumber, task.id)
                    : uncompleteTask(dayNumber, task.id)
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
                {/* <p>
                  <strong>Type:</strong> {selectedTask.type}
                </p>
                <p>
                  <strong>Category:</strong> {selectedTask.category}
                </p> */}
                <p>
                  <strong>Description:</strong> {selectedTask.description}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  {selectedTask.completed_at !== null ? 'Completed' : 'Not Completed'}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onOpenChange}>
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

export default TaskList;
