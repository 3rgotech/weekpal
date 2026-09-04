import React from "react";
import { Dropdown, Header, Label, Separator } from "@heroui/react";
import {
  Copy,
  EllipsisVertical,
  SquareArrowDownLeft,
  SquareArrowDownRight,
  SquareArrowRight,
  SquareArrowUpRight,
  Trash,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useData } from "../contexts/DataContext";
import { useSettings } from "../contexts/SettingsContext";
import useDayJs from "../utils/dayjs";
import { availableMoves, moveTarget, TaskMove } from "../utils/taskMoves";

const MOVE_LABELS: Record<TaskMove, string> = {
  today: "task.menu.today",
  tomorrow: "task.menu.tomorrow",
  nextMonday: "task.menu.next_monday",
  nextWeekSameDay: "task.menu.next_week",
  thisWeek: "task.menu.this_week",
  someday: "task.menu.some_day",
};

const MOVE_ICONS: Record<TaskMove, React.ComponentType<{ size?: number }>> = {
  today: SquareArrowRight,
  tomorrow: SquareArrowRight,
  nextMonday: SquareArrowUpRight,
  nextWeekSameDay: SquareArrowUpRight,
  thisWeek: SquareArrowDownLeft,
  someday: SquareArrowDownRight,
};

interface TaskMenuProps {
  task: Task;
  /** Called after any action that settles the task — the modal uses it to close itself. */
  onAction?: () => void;
  size?: number;
}

/**
 * The ⋮ menu on a task: where it can go, and what can be done to it.
 *
 * One component for both layouts. On a wide screen it hangs off the edit modal's header; on a
 * narrow one it sits on the row itself, where it is the only way to move a task — there is no
 * dragging on a phone, so a menu that merely listed destinations without acting on them would
 * leave a task stuck where it is.
 *
 * The `dark:text-white` every item used to carry is gone: HeroUI 2 painted its menu items from a
 * theme the provider never propagated to `<body>`, where this app's theme class lives, so unstyled
 * items came out near-black on a dark popover. v3 colours from CSS variables and needs no help.
 */
const TaskMenu: React.FC<TaskMenuProps> = ({ task, onAction, size = 16 }) => {
  const { t } = useTranslation();
  const dayjs = useDayJs();
  const { relocateTask, duplicateTask, deleteTask } = useData();
  const { settings: { weekStartsOn } } = useSettings();

  const moves = availableMoves(task, dayjs(), weekStartsOn);

  const run = async (action: () => void | Promise<void>) => {
    await action();
    onAction?.();
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="p-0.5"
        aria-label={t("task.menu.open")}
      >
        <EllipsisVertical size={size} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={t("task.menu.open")}>
          <Dropdown.Section>
            <Header>{t("task.menu.move")}</Header>
            {moves.map((move) => {
              const Icon = MOVE_ICONS[move];

              return (
                <Dropdown.Item
                  key={move}
                  id={move}
                  textValue={t(MOVE_LABELS[move])}
                  onAction={() => run(() => relocateTask(task, moveTarget(task, move, dayjs(), weekStartsOn)))}
                >
                  <Label>{t(MOVE_LABELS[move])}</Label>
                  <Icon size={12} />
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>

          <Separator />

          <Dropdown.Section>
            <Header>{t("task.menu.actions")}</Header>
            <Dropdown.Item
              id="duplicate"
              textValue={t("task.menu.duplicate")}
              onAction={() => run(() => duplicateTask(task))}
            >
              <Label>{t("task.menu.duplicate")}</Label>
              <Copy size={12} />
            </Dropdown.Item>
            <Dropdown.Item
              id="delete"
              variant="danger"
              textValue={t("task.menu.delete")}
              onAction={() => run(() => deleteTask(task))}
            >
              <Label>{t("task.menu.delete")}</Label>
              <Trash size={12} />
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};

export default TaskMenu;
