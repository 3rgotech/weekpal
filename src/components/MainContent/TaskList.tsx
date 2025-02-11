import React, { useState, useContext } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DataContext } from '../../contexts/DataContext';
import { Task, WeekTaskList } from '../../types';
import Droppable from './test/Droppable';
import Draggable from './test/Draggable';

interface TaskProps {
  weekNumber: number;
  dayNumber: keyof WeekTaskList;
}

const TaskList: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
  const { tasks, categoryList, completeTask, uncompleteTask, deleteTask, setTasks, setTasksStorage } = useContext(DataContext);

  const taskList = tasks[dayNumber] || [];

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = taskList.findIndex((task) => task.id === active.id);
    const newIndex = taskList.findIndex((task) => task.id === over.id);

    const newTasks = arrayMove(taskList, oldIndex, newIndex);

    // Mise à jour du state React
    setTasks((prevTasks) => {
      const updatedTasks = { ...prevTasks, [dayNumber]: newTasks };

      // Mise à jour du localStorage
      setTasksStorage((prevStorage) => ({
        ...prevStorage,
        [weekNumber]: {
          ...prevStorage[weekNumber] ?? {},
          [dayNumber]: newTasks
        }
      }));

      return updatedTasks;
    });
  };



  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={taskList.map((task) => task.id)}>
        <ul>
          {taskList.map((task) => (
            <Droppable key={task.id} id={task.id}>
              <DraggableTask task={task} dayNumber={dayNumber} />
            </Droppable>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

const DraggableTask = ({ task, dayNumber }) => {
  const { completeTask, uncompleteTask, categoryList } = useContext(DataContext);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners} className="p-4 border rounded-lg mb-2">
      <h3 className="text-md font-medium">{task.title}</h3>
      <p>
        <strong>Category:</strong>
        {task.category === null ? 'Ø' : categoryList.find((c) => c.id === task.category)?.label ?? 'Ø'}
      </p>
      <label className="flex items-center space-x-2">
        <span>Done:</span>
        <input
          type="checkbox"
          checked={task.completed_at !== null}
          onChange={(e) => e.target.checked ? completeTask(dayNumber, task.id) : uncompleteTask(dayNumber, task.id)}
          className="cursor-pointer"
        />
      </label>
    </li>
  );
};

export default TaskList;
