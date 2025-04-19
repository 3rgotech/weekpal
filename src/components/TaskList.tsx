import React from "react";
import { SortableContext } from "@dnd-kit/sortable";
import { useData } from "../contexts/DataContext";
import { DayOfWeek } from "../types";
import DraggableTask from "./DraggableTask";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import TaskListHeader from "./TaskListHeader";
import NewTask from "./NewTask";
import { useCalendar } from "../contexts/CalendarContext";
import clsx from "clsx";
import EventList from "./EventList";
import { useSettings } from "../contexts/SettingsContext";

interface TaskProps {
  title: string;
  dayOfWeek: DayOfWeek;
  isToday?: boolean;
}

const TaskList: React.FC<TaskProps> = ({
  title,
  dayOfWeek,
  isToday = false,
}) => {
  const { currentWeek, firstDayOfWeek } = useCalendar();
  const { settings } = useSettings();
  const { tasks, events } = useData();

  const { setNodeRef, isOver } = useDroppable({
    id: `${dayOfWeek}-droppable`,
    data: {
      dayOfWeek,
      type: "container",
    },
  });

  const filteredTasks = tasks.filter(
    (task) =>
      task.dayOfWeek === dayOfWeek &&
      (settings.showCompletedTasks || !task.completed)
  );

  const taskIds = filteredTasks
    .map((task) => task.id)
    .filter((id) => id !== null && id !== undefined)
    .map((id) => `task-${id}`);

  const filteredEvents = events.filter(
    (event) => event.dayOfWeek === dayOfWeek
  );

  return (
    <div ref={setNodeRef} className={`h-full flex flex-col`}>
      <TaskListHeader
        title={title}
        dayOfWeek={dayOfWeek}
        weekCode={currentWeek}
        isToday={isToday}
      />
      {filteredEvents.length > 0 && <EventList events={filteredEvents} />}
      <ul className={clsx("flex-1 overflow-y-auto py-1 space-y-2")}>
        <SortableContext items={taskIds}>
          {filteredTasks.map((task) => (
            <DraggableTask key={task.id} task={task} dayOfWeek={dayOfWeek} />
          ))}
        </SortableContext>
        {!isOver && <NewTask dayOfWeek={dayOfWeek} />}
      </ul>
    </div>
  );
};

export default TaskList;
