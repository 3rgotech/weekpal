import { ChevronLeft, ChevronRight, Dot } from "lucide-react";
import React from "react";
import { useCalendar } from "../contexts/CalendarContext";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";

const WeekSelector: React.FC = () => {
  const { settings } = useSettings();
  const { currentDate, goToPreviousWeek, goToNextWeek, goToToday } = useCalendar();
  const dayjs = useDayJs(settings.language);

  // Obtenir le numéro de la semaine, le mois et l'année
  const weekNumber = currentDate.week();
  const month = currentDate.format("MMMM"); // Nom complet du mois (ex: "January")
  const year = currentDate.format("YYYY"); // Année (ex: "2025")

  // TODO : Translation
  const title = dayjs(currentDate)
    .format(settings.weekHeaderFormat)
    .replace('[WEEK]', 'Week')
    .replace('[OF]', 'of');

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <div>{title}</div>
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
