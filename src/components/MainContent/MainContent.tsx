import React, { useContext } from 'react';
import Days from './Days';
import { DataContext } from '../../contexts/DataContext';

const MainContent: React.FC = () => {
  const { currentDate } = useContext(DataContext);
  // Obtenir le premier jour de la semaine (lundi)
  const firstDayOfWeek = currentDate.startOf('isoWeek');
  return (
    <div className="p-4 h-full flex flex-col">
    <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4">
      {[...Array(9).keys()].map((i) => {
        const dayNumber = i <= 6 ? i : 0;
        const day = firstDayOfWeek.add(dayNumber, 'day');
        let title = day.format('dddd DD');
        let gridCls = "col-span-1 row-span-2";
        if (i === 5 || i === 6) {
          gridCls = "col-span-1 row-span-1";
        }
        else if (i === 7) {
          title = "This week";
          gridCls = 'col-span-3 row-span-1';
        } else if (i === 8) {
          title = "One day";
          gridCls = 'col-span-3 row-span-1';
        }
        return (
          <div className={`${gridCls} border rounded-lg p-4`} key={i}>
            <Days title={title} dayNumber={dayNumber} />
          </div>
        );
      })}
    </div>
    </div>
  );
};

export default MainContent;