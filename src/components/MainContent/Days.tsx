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
  category: number | null;
  description: string;
}

const LOCAL_STORAGE_KEY = 'tasks';

const defaultFormData: TaskItem = {
  type: '',
  title: '',
  category: null,
  description: ''
};

const Days: React.FC<DaysProps> = ({ title, dayNumber, weekNumber }) => {
  const { addTask, categoryList } = useContext(DataContext);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newTask, setNewTask] = useState<TaskItem>(defaultFormData);

  const handleAddTask = () => {
    addTask(dayNumber, newTask);
    setNewTask(defaultFormData);
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
                  <select
                    onChange={(e) => setNewTask({ ...newTask, category: (e.target.value.length === 0 ? null : parseInt(e.target.value, 10)) })}
                    className="border p-2 w-full"
                  >
                    <option value="" selected={newTask.category === null}>All</option>
                    {categoryList.map((category) => (
                      <option key={category.id} value={category.id} selected={category.id === newTask.category}>
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

export default Days;
