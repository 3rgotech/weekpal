import React from "react";
import { useCalendar } from "../contexts/CalendarContext";
import IconButton from "./IconButton";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { useTranslation } from "react-i18next";
import { ICON_BUTTON_CLASS, ICON_BUTTON_WRAPPER_CLASS } from "../utils/color";

const WeekSelector: React.FC = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { currentDate, goToPreviousWeek, goToNextWeek, goToToday } =
    useCalendar();
  const dayjs = useDayJs(settings.language);

  const [title1, title2] = dayjs(currentDate)
    .format(settings.weekHeaderFormat)
    .replace("[WEEK]", t("misc.week"))
    .replace("[OF]", t("misc.of"))
    .split(" - ");

  return (
    <div className="flex items-stretch">
      <div className="flex items-center justify-center border-r border-slate-300 dark:border-sky-900">
        <div className="px-8">
          <span className="font-bold">{title1}</span>
          <span className=""> - {title2}</span>
        </div>
      </div>
      <div className="flex items-center justify-center size-16 border-r border-slate-300 dark:border-sky-900">
        <IconButton
          icon="chevronLeft"
          onClick={goToPreviousWeek}
          iconClass={ICON_BUTTON_CLASS}
          wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
          tooltip={t("actions.previous_week")}
        />
      </div>
      <div className="flex items-center justify-center size-16 border-r border-slate-300 dark:border-sky-900">
        <IconButton
          icon="dot"
          onClick={goToToday}
          iconClass={ICON_BUTTON_CLASS}
          wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
          tooltip={t("actions.this_week")}
        />
      </div>
      <div className="flex items-center justify-center size-16 border-r border-slate-300 dark:border-sky-900">
        <IconButton
          icon="chevronRight"
          onClick={goToNextWeek}
          iconClass={ICON_BUTTON_CLASS}
          wrapperClass={ICON_BUTTON_WRAPPER_CLASS}
          tooltip={t("actions.next_week")}
        />
      </div>
    </div>
  );
};

export default WeekSelector;
