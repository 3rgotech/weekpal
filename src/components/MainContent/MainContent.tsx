import React from 'react';
import Days from './Days';

const MainContent: React.FC = () => {
    return (
<div className="p-4 h-screen flex flex-col">
  {/* Section principale avec les jours */}
  <div className="grid grid-cols-6 gap-4 mb-4 flex-grow"> {/* 6 colonnes pour les jours */}
    <div className="col-span-1 border rounded-lg p-4"> {/* Day 1 */}</div>
    <div className="col-span-1 border rounded-lg p-4"> {/* Day 2 */}</div>
    <div className="col-span-1 border rounded-lg p-4"> {/* Day 3 */}</div>
    <div className="col-span-1 border rounded-lg p-4"> {/* Day 4 */}</div>
    <div className="col-span-1 border rounded-lg p-4"> {/* Day 5 */}</div>

    <div className="col-span-1 space-y-4 flex flex-col"> {/* Day 6 et 7 */}
      <div className="border rounded-lg p-4 flex-grow">{/* Day 6 */}</div>
      <div className="border rounded-lg p-4 flex-grow">{/* Day 7 */}</div>
    </div>
  </div>

  {/* Section "Someday" */}
  <div className="flex gap-4 h-1/4"> {/* Section Someday occupe 1/4 de l'écran */}
    <div className="flex-1 border rounded-lg p-4">{/* Someday Section 1 */}</div>
    <div className="flex-1 border rounded-lg p-4">{/* Someday Section 2 */}</div>
  </div>
</div>


    );
};

export default MainContent;