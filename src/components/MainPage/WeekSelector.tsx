import React from 'react';
import * as dayjs from 'dayjs';
import { useState } from 'react';

const WeekSelector: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(dayjs());

    const handlePreviousWeek = () => {
        setCurrentDate(currentDate.subtract(1, 'week'));
    };

    const handleCurrentWeek = () => {
        setCurrentDate(dayjs());
    };

    const handleNextWeek = () => {
        setCurrentDate(currentDate.add(1, 'week'));
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
                <div>{`Week of ${currentDate.startOf('week').format('MMMM D, YYYY')}`}</div>
                <div className="flex gap-2">
                    <button onClick={handlePreviousWeek} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button onClick={handleCurrentWeek} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dot"><circle cx="12.1" cy="12.1" r="1"/></svg>
                    </button>
                    <button onClick={handleNextWeek} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeekSelector;
