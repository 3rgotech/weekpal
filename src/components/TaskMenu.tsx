import React from "react";
import { Dropdown, Header, Label, Separator } from "@heroui/react";
import clsx from "clsx";
import {
  ArrowRight,
  Archive,
  CalendarArrowUp,
  CalendarCheck,
  CalendarPlus,
  CalendarRange,
  Copy,
  EllipsisVertical,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Dayjs } from "dayjs";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import { useCalendar } from "../contexts/CalendarContext";
import useDayJs from "../utils/dayjs";
import { availableMoves, moveTarget, TaskMove } from "../utils/taskMoves";
import {
  MENU_HINT_CLASS,
  MENU_ICON_CLASS,
  MENU_POPOVER_CLASS,
  MENU_ROW_CLASS,
  MENU_SECTION_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
} from "../utils/menu";

const MOVE_LABELS: Record<TaskMove, string> = {
  today: "task.menu.today",
  tomorrow: "task.menu.tomorrow",
  nextMonday: "task.menu.next_monday",
  nextWeekSameDay: "task.menu.next_week",
  thisWeek: "task.menu.this_week",
  someday: "task.menu.some_day",
};

const MOVE_ICONS: Record<TaskMove, React.ComponentType<{ size?: number; className?: string }>> = {
  today: CalendarCheck,
  tomorrow: ArrowRight,
  nextMonday: CalendarArrowUp,
  nextWeekSameDay: CalendarPlus,
  thisWeek: CalendarRange,
  someday: Archive,
};

interface TaskMenuProps {
  task: Task;
  /** Called after any action that settles the task — the modal uses it to close itself. */
  onAction?: () => void;
  size?: number;
  /** The trigger's own look, where it sits: a bare glyph in the modal header, a hit target on a phone row. */
  triggerClassName?: string;
}

/**
 * The ⋮ menu on a task: where it can go, and what can be done to it.
 *
 * One component for both layouts. On a wide screen it hangs off the edit modal's header; on a
 * narrow one it sits on the row itself, where it is the only way to move a task — there is no
 * dragging on a phone, so a menu that merely listed destinations without acting on them would
 * leave a task stuck where it is.
 *
 * Each destination that is a date says which one — "Tomorrow · 25 Sep" — so the choice is made
 * against the calendar rather than against a mental count of days.
 */
const TaskMenu: React.FC<TaskMenuProps> = ({ task, onAction, size = 16, triggerClassName }) => {
  const { t } = useTranslation();
  const dayjs = useDayJs();
  const { relocateTask, duplicateTask, deleteTask } = useData();
  const { settings: { weekStartsOn } } = useSettings();
  const { dateOf } = useCalendar();

  const moves = availableMoves(task, dayjs(), weekStartsOn);

  /*
   * The date a move lands on, where it lands on one. The undated buckets have none, and "next
   * week, same day" is counted from the day the task is on — which is on the week being shown,
   * since that is the only week a menu can be opened from.
   */
  const landsOn = (move: TaskMove): Dayjs | null => {
    const now = dayjs();

    switch (move) {
      case "today":
        return now;
      case "tomorrow":
        return now.add(1, "day");
      case "nextMonday":
        return now.add(1, "week").startOf("isoWeek");
      case "nextWeekSameDay":
        return task.dayOfWeek ? dateOf(task.dayOfWeek)?.add(1, "week") ?? null : null;
      default:
        return null;
    }
  };

  const run = async (action: () => void | Promise<void>) => {
    await action();
    onAction?.();
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={clsx(
          "cursor-pointer text-wp-fg-secondary hover:bg-wp-track rounded-md",
          triggerClassName ?? "p-0.5",
        )}
        aria-label={t("task.menu.open")}
      >
        <EllipsisVertical size={size} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className={MENU_POPOVER_CLASS}>
        <Dropdown.Menu aria-label={t("task.menu.open")}>
          <Dropdown.Section>
            <Header className={MENU_SECTION_LABEL_CLASS}>{t("task.menu.move")}</Header>
            {moves.map((move) => {
              const Icon = MOVE_ICONS[move];
              const date = landsOn(move);

              return (
                <Dropdown.Item
                  key={move}
                  id={move}
                  className={MENU_ROW_CLASS}
                  textValue={t(MOVE_LABELS[move])}
                  onAction={() => run(() => relocateTask(task, moveTarget(task, move, dayjs(), weekStartsOn)))}
                >
                  <Icon size={16} className={MENU_ICON_CLASS} />
                  <Label>{t(MOVE_LABELS[move])}</Label>
                  {date && <span className={MENU_HINT_CLASS}>{date.format("D MMM")}</span>}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>

          <Separator className={MENU_SEPARATOR_CLASS} />

          {/* No heading over these two: the separator already says "and now something else",
              and a second small-caps label in an eight-row menu is one too many. */}
          <Dropdown.Section aria-label={t("task.menu.actions")}>
            <Dropdown.Item
              id="duplicate"
              className={MENU_ROW_CLASS}
              textValue={t("task.menu.duplicate")}
              onAction={() => run(() => duplicateTask(task))}
            >
              <Copy size={16} className={MENU_ICON_CLASS} />
              <Label>{t("task.menu.duplicate")}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="delete"
              variant="danger"
              className={clsx(MENU_ROW_CLASS, "text-wp-danger")}
              textValue={t("task.menu.delete")}
              onAction={() => run(() => deleteTask(task))}
            >
              <Trash2 size={16} className="shrink-0 text-wp-danger" />
              <Label>{t("task.menu.delete")}</Label>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

export default TaskMenu;
