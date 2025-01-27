import React, { useContext, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
} from '@nextui-org/react';

import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { DataContext } from '../../contexts/DataContext';
import { WeekTaskList } from '../../types';

dayjs.extend(isoWeek);

interface DaysProps {
  title: string;
  dayNumber: keyof WeekTaskList;
  weekNumber: number;
}

interface TaskItem {
  type: string;
  title: string;
  category: string;
  description: string;
  done: boolean;
}

const LOCAL_STORAGE_KEY = 'tasks';

const Days: React.FC<DaysProps> = ({ title, dayNumber, weekNumber }) => {
  const { addTask } = useContext(DataContext);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newTask, setNewTask] = useState<TaskItem>({
    type: '',
    title: '',
    category: '',
    description: '',
    done: false,
  });

  const handleAddTask = () => {
    addTask(dayNumber, newTask)


    // const storedTasks = localStorage.getItem(LOCAL_STORAGE_KEY);
    // const parsedTasks = storedTasks ? JSON.parse(storedTasks) : {};
    // const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;

    // if (!parsedTasks[weekKey]) {
    //   parsedTasks[weekKey] = {
    //     0: [],
    //     1: [],
    //     2: [],
    //     3: [],
    //     4: [],
    //     5: [],
    //     6: [],
    //     this_week: [],
    //   };
    // }

    // if (dayNumber === 7) {
    //   parsedTasks[weekKey]['this_week'].push(newTask);
    // } else {
    //   parsedTasks[weekKey][dayNumber].push(newTask);
    // }

    // localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsedTasks));
    setNewTask({
      type: '',
      title: '',
      category: '',
      description: '',
      done: false,
    });
    onOpenChange(); // Fermer la modale
  };

  return (
    <div className="p-4 border rounded">
      <h2>{title}</h2>
      <Button onPress={onOpen} className="bg-blue-500 text-white px-4 py-2 rounded">
        Add Task
      </Button>

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
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="border p-2 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Type"
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                    className="border p-2 w-full"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="border p-2 w-full"
                  />
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

export default Days;
