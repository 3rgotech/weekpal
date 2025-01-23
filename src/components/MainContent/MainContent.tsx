import React, { useContext } from 'react';
import Days from './Days';
import Task from './Task'; // Importer le composant Task
import { DataContext } from '../../contexts/DataContext';

const MainContent: React.FC = () => {
  const { currentDate } = useContext(DataContext);

  // Obtenir le premier jour de la semaine (lundi)
  const firstDayOfWeek = currentDate.startOf('isoWeek');
  const currentWeekNumber = currentDate.isoWeek(); // Numéro de la semaine

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-grow grid grid-cols-6 grid-rows-3 gap-4 mb-4">
        {[...Array(9).keys()].map((i) => {
          const dayNumber = i <= 8 ? i : 0; // Jour spécifique ou valeur par défaut
          const day = firstDayOfWeek.add(dayNumber, 'day');
          let title = day.format('dddd DD');
          let gridCls = "col-span-1 row-span-2";

          if (i === 5 || i === 6) {
            gridCls = "col-span-1 row-span-1";
          } else if (i === 7) {
            title = "This week";
            gridCls = 'col-span-3 row-span-1';
          } else if (i === 8) {
            title = "One day";
            gridCls = 'col-span-3 row-span-1';
          }

          return (
            <div className={`${gridCls} border rounded-lg p-4`} key={i}>
              <Days title={title} dayNumber={dayNumber} />
              {i <= 8 && (
                // Afficher les tâches seulement pour les jours spécifiques de la semaine
                <Task weekNumber={currentWeekNumber} dayNumber={dayNumber} />
              )}
              
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MainContent;
