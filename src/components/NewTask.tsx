import { Plus } from 'lucide-react';
import React, { useRef, useState } from 'react'
import { useData } from '../contexts/DataContext';
import Task from '../data/task';
import { DayOfWeek, WeekTaskList } from '../types';
import IconButton from './IconButton';
import { useCalendar } from '../contexts/CalendarContext';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface NewTaskProps {
    dayOfWeek: DayOfWeek;
}

const NewTask = ({ dayOfWeek }: NewTaskProps) => {
    const { currentWeek } = useCalendar();
    const { addTask } = useData();
    const { t } = useTranslation();
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
                weekCode: currentWeek,
                dayOfWeek
            });
            addTask(task);
            handleCancel();
            setTimeout(() => {
                setCreatingNewTask(true);
            }, 100);
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
        <li className={clsx(
            `flex items-center justify-between h-10 px-2 py-1 border rounded-md bg-white dark:bg-slate-700 shadow-sm`,
            creatingNewTask ? "border-slate-400 dark:border-slate-600" : "border-transparent"
        )}>
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
                            className="w-full ring-0 outline-none h-8 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        />
                        <IconButton icon="plus" onClick={handleSubmit} size="xs" className="bg-sky-50 dark:bg-sky-900" />
                    </>
                ) : (
                    <button
                        className="text-sm text-slate-400 dark:text-slate-400 h-8"
                        onClick={() => setCreatingNewTask(true)}>
                        {t('main.add_new_task')}
                    </button>
                )}
            </div>
        </li>
    );
}

export default NewTask