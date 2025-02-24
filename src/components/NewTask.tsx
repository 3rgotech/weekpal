import { Plus } from 'lucide-react';
import React, { useRef, useState } from 'react'
import { useData } from '../contexts/DataContext';
import Task from '../data/task';
import { WeekTaskList } from '../types';
import IconButton from './IconButton';

interface NewTaskProps {
    dayNumber: keyof WeekTaskList;
}

const NewTask = ({ dayNumber }: NewTaskProps) => {
    const { addTask } = useData();
    const [creatingNewTask, setCreatingNewTask] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const handleCancel = () => {
        setCreatingNewTask(false);
        setInputValue('');
    };

    const handleSubmit = () => {
        if (inputValue.trim()) {
            const task = new Task({
                title: inputValue,
                dayOfWeek: dayNumber
            });
            addTask(task);
            handleCancel();
        }
    };

    const handleFocusOut = (e: React.FocusEvent) => {
        // Check if the next focused element is outside our component
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
            handleCancel();
        }
    };

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                handleCancel();
            }
        };

        if (creatingNewTask) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [creatingNewTask]);

    return (
        <li className={`flex items-center justify-between px-1 py-1 border ${creatingNewTask ? "border-gray-200" : "border-transparent"} rounded-lg`}>
            <div
                ref={wrapperRef}
                className="flex w-full items-center"
                onFocusCapture={e => {
                    if (!creatingNewTask) setCreatingNewTask(true);
                }}
                onBlurCapture={handleFocusOut}
            >
                {creatingNewTask ? (
                    <>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    handleCancel();
                                } else if (e.key === "Enter") {
                                    handleSubmit();
                                }
                            }}
                            className="w-full ring-0 outline-none h-8"
                        />
                        <IconButton icon={<Plus />} onClick={handleSubmit} small />
                    </>
                ) : (
                    <button
                        className="text-sm text-gray-500 h-8"
                        onClick={() => setCreatingNewTask(true)}>
                        Click to add task
                    </button>
                )}
            </div>
        </li>
    );
}

export default NewTask