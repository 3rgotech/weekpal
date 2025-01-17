import React, { createContext, useState, ReactNode } from 'react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// Ajouter le plugin weekOfYear
dayjs.extend(weekOfYear);


interface DataContextProps {
    data: any;
    setData: (data: any) => void;
    currentDate: dayjs.Dayjs;
    goToPreviousWeek: () => void;
    goToNextWeek: () => void;
    goToToday: () => void;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<any>(null);
    const [currentDate, setCurrentDate] = useState(dayjs());
    
    const goToPreviousWeek = () => {
        setCurrentDate(cd => cd.subtract(1, 'week'));
    }
    const goToNextWeek = () => {
        setCurrentDate(cd => cd.add(1, 'week'));
    }
    const goToToday = () => {
        setCurrentDate(dayjs());
    }

    return (
        <DataContext.Provider value={{ data, setData, currentDate, goToPreviousWeek, goToNextWeek, goToToday }}>
            {children}
        </DataContext.Provider>
    );
};

export { DataContext, DataProvider };