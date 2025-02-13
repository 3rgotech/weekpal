import React, { useContext } from 'react';
import { SortableContext } from '@dnd-kit/sortable';
import { DataContext } from '../../contexts/DataContext';
import { WeekTaskList } from '../../types';
import DraggableTask from './test/Draggable';
import Droppable from './test/Droppable';
import { useDroppable } from '@dnd-kit/core';

interface TaskProps {
  weekNumber: number;
  dayNumber: keyof WeekTaskList;
}

const TaskList: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
  const { tasks, setTasks, setTasksStorage, currentWeekNumber } = useContext(DataContext);
  const { setNodeRef } = useDroppable({
    id: 'day-' + dayNumber,
    data: {
      type: 'container',
      dayNumber
    }
  })
  const taskList = tasks[dayNumber] || [];



  return (
    <div ref={setNodeRef}>
      <SortableContext items={taskList.map((task) => task.id)}>
        <ul>
          {taskList.map((task) => (
            <DraggableTask key={task.id} task={task} dayNumber={dayNumber} />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
};

export default TaskList;