import React, { useState, useEffect } from 'react';
import tasksData from '../../data/data.json'; // Remplacez par le chemin réel

interface TaskProps {
  weekNumber: number;
  dayNumber: number;
}

interface Task {
  type: string;
  title: string;
  category: string;
  description: string;
  done: boolean;
}

const Task: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let dayTasks: Task[] = [];

    if (dayNumber === 7) {
      // Gestion spéciale pour `this_week`
      const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;
      dayTasks = tasksData[weekKey]?.["this_week"] || [];
    } else if (dayNumber === 8) {
      // Gestion spéciale pour `one_day`
      dayTasks = tasksData["one_day"] || [];
    } else {
      // Gestion normale pour semaine et jour spécifiques
      const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;
      dayTasks = tasksData[weekKey]?.[dayNumber] || [];
    }

    setTasks(dayTasks);
  }, [weekNumber, dayNumber]);

  return (
    <div>
      {tasks.length > 0 ? (
        <ul>
          {tasks.map((task, index) => (
            <li
              key={index}
              className={`p-4 border rounded-lg mb-2 ${
                task.done ? 'line-through text-gray-500' : ''
              }`}
            >
              <h2 className="text-lg font-semibold">{task.type}</h2>
              <h3 className="text-md font-medium">{task.title}</h3>
              <p className="text-sm text-gray-700">Category: {task.category}</p>
              <p className="text-sm text-gray-600">Description: {task.description}</p>
              <label className="flex items-center space-x-2">
                <span>Done:</span>
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => {
                    setTasks((prevTasks) =>
                      prevTasks.map((t, i) =>
                        i === index ? { ...t, done: !t.done } : t
                      )
                    );
                  }}
                  className="cursor-pointer"
                />
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No tasks for this day.</p>
      )}
    </div>
  );
};

export default Task;
