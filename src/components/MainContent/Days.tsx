import React, { useContext } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { DataContext } from '../../contexts/DataContext';

// Activer le support pour les semaines ISO
dayjs.extend(isoWeek);

interface DaysProps {
    title: string;
    dayNumber: number;
}

const Days: React.FC<DaysProps> = ({ title, dayNumber }) => {
    return (
        <div className="p-4 border rounded">
            <div>
                {/* Afficher le jour et la date calculée */}
                {title}
            </div>
        </div>
    );
};

export default Days;
