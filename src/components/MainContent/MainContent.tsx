import React, { useContext } from 'react';
import Days from './Days';
import TaskList from './TaskList';
import { DataContext } from '../../contexts/DataContext';
import { WeekTaskList } from '../../types';

interface MainContentProps {
  selectedCategory: string; // ✅ Ajout de la prop
}

const MainContent: React.FC<MainContentProps> = ({ selectedCategory }) => { // ✅ Utilisation correcte de la prop
  const { currentDate } = useContext(DataContext);

  // Obtenir le premier jour de la semaine (lundi)
  const firstDayOfWeek = currentDate.startOf('isoWeek');
  const currentWeekNumber = currentDate.isoWeek(); // Numéro de la semaine

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4">
        {[...Array(7).keys()].map((i) => {
          const day = firstDayOfWeek.add(i, 'day');
          let title = day.format('dddd DD');
          let gridCls = "col-span-1 row-span-2";

          if (i === 5 || i === 6) {
            gridCls = "col-span-1 row-span-1";
          }

          return (
            <div className={`${gridCls} border rounded-lg p-4`} key={i}>
              <Days title={title} dayNumber={`${i+1}` as keyof WeekTaskList} weekNumber={currentWeekNumber} />
              <TaskList weekNumber={currentWeekNumber} dayNumber={`${i+1}` as keyof WeekTaskList} selectedCategory={selectedCategory}/>
            </div>
          );
        })}
        <div className={`col-span-3 row-span-1 border rounded-lg p-4`}>
          <Days title={"This week"} dayNumber={'0'} weekNumber={currentWeekNumber} />
          <TaskList weekNumber={currentWeekNumber} dayNumber={'0'} selectedCategory={selectedCategory} />
        </div>
        <div className={`col-span-3 row-span-1 border rounded-lg p-4`}>
          <Days title={"One day"} dayNumber={"someday"} weekNumber={currentWeekNumber} />
          <TaskList weekNumber={currentWeekNumber} dayNumber={"someday"} selectedCategory={selectedCategory} />
        </div>
      </div>
    </div>
  );
};

export default MainContent;
