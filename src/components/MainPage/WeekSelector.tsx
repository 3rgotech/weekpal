import React, { useContext, useState } from 'react';
import { DataContext } from '../../contexts/DataContext';


const WeekSelector: React.FC = () => {
    const {currentDate, goToPreviousWeek, goToNextWeek, goToToday} = useContext(DataContext);


    // Obtenir le numéro de la semaine, le mois et l'année
    const weekNumber = currentDate.week();
    const month = currentDate.format('MMMM'); // Nom complet du mois (ex: "January")
    const year = currentDate.format('YYYY'); // Année (ex: "2025")

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
                <div>{`Week ${weekNumber} - ${month} ${year}`}</div>
                <div className="flex gap-2">
                    <button onClick={goToPreviousWeek} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button onClick={goToToday} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dot"><circle cx="12.1" cy="12.1" r="1"/></svg>
                    </button>
                    <button onClick={goToNextWeek} className="rounded-full p-2 border border-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeekSelector;
