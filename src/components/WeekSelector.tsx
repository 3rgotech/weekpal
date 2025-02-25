import { ChevronLeft, ChevronRight, Dot } from "lucide-react";
import React from "react";
import { useCalendar } from "../contexts/CalendarContext";
import IconButton from "./IconButton";

const WeekSelector: React.FC = () => {
  const { currentDate, goToPreviousWeek, goToNextWeek, goToToday } = useCalendar();

  // Obtenir le numéro de la semaine, le mois et l'année
  const weekNumber = currentDate.week();
  const month = currentDate.format("MMMM"); // Nom complet du mois (ex: "January")
  const year = currentDate.format("YYYY"); // Année (ex: "2025")

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div>{`Week ${weekNumber} - ${month} ${year}`}</div>
        <div className="flex gap-2">
          <IconButton icon="chevronLeft" onClick={goToPreviousWeek} />
          <IconButton icon="dot" onClick={goToToday} />
          <IconButton icon="chevronRight" onClick={goToNextWeek} />
        </div>
      </div>
    </div>
  );
};

export default WeekSelector;
