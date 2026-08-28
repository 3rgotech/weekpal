import React from "react";
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
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
 * Every item carries `dark:text-white`, as every other menu in the app does: the theme class goes
 * on `<body>` (`SettingsContext`), so HeroUI's own dark item colour never lands and unstyled items
 * render near-black on the dark popover.
 */
const TaskMenu: React.FC<TaskMenuProps> = ({ task, onAction, size = 16 }) => {
  const { t } = useTranslation();
  const dayjs = useDayJs();
  const { relocateTask, duplicateTask, deleteTask } = useData();

  const moves = availableMoves(task, dayjs());

  const run = async (action: () => void | Promise<void>) => {
    await action();
    onAction?.();
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <button className="p-0.5 dark:text-white" aria-label={t("task.menu.open")}>
          <EllipsisVertical size={size} />
        </button>
      </DropdownTrigger>
      <DropdownMenu aria-label={t("task.menu.open")}>
        <DropdownSection title={t("task.menu.move")}>
          {moves.map((move) => {
            const Icon = MOVE_ICONS[move];

            return (
              <DropdownItem
                key={move}
                className="dark:text-white"
                endContent={<Icon size={12} />}
                onPress={() => run(() => relocateTask(task, moveTarget(task, move, dayjs())))}
              >
                {t(MOVE_LABELS[move])}
              </DropdownItem>
            );
          })}
        </DropdownSection>

        <DropdownSection title={t("task.menu.actions")}>
          <DropdownItem
            key="duplicate"
            className="dark:text-white"
            endContent={<Copy size={12} />}
            onPress={() => run(() => duplicateTask(task))}
          >
            {t("task.menu.duplicate")}
          </DropdownItem>
          <DropdownItem
            key="delete"
            color="danger"
            classNames={{ base: "text-red-700", description: "text-red-700" }}
            endContent={<Trash size={12} />}
            onPress={() => run(() => deleteTask(task))}
          >
            {t("task.menu.delete")}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
};

export default TaskMenu;
