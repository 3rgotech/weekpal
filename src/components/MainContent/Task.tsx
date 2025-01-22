import React, { useEffect, useState } from 'react';

// Données JSON importées
const tasksData = require('../../data/data.json');


interface TaskProps {
    weekNumber: number; // Numéro de la semaine
    dayNumber: number; // Numéro du jour
}
interface Task {
    type: string;
    done: boolean;
    title: string;
    category: string;
    description: string;
}

const Task: React.FC<TaskProps> = ({ weekNumber, dayNumber }) => {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        // Récupérer les tâches correspondant à weekNumber et dayNumber
        const weekKey = `2025w${String(weekNumber).padStart(2, '0')}`;
        const dayTasks = tasksData[weekKey]?.[dayNumber] || [];
        setTasks(dayTasks);
    }, [weekNumber, dayNumber]);

    return (
        <div>
            
            {tasks.length > 0 ? (
                <ul>
                    {tasks.map((task, index) => (
                        
                        <li key={index} className={`task ${task.done ? 'done' : ''}`}>
                            <h2>{task.type}</h2>
                            <h3>{task.title}</h3>
                            <p>Category : {task.category}</p>
                            <p>Description : {task.description}</p>
                            <label>
                                Done : <input type="checkbox" checked={task.done} readOnly />
                            </label>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No tasks for this day.</p>
            )}
        </div>
    );
};

export default Task;
