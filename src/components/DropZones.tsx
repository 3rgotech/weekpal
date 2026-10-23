import React from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { CalendarArrowUp, CalendarPlus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import { useSettings } from "../contexts/SettingsContext";
import { useCalendar } from "../contexts/CalendarContext";
import useDayJs from "../utils/dayjs";
import { availableMoves, moveDate, moveTarget } from "../utils/taskMoves";

/** What a task can be dropped onto besides a list: the menu's three most used entries. */
export type DropAction = "nextMonday" | "nextWeekSameDay" | "delete";

/** The prefix every zone's droppable id carries, so the board can tell a zone from a list. */
export const DROP_ZONE_PREFIX = "action-";

const LABELS: Record<DropAction, string> = {
  nextMonday: "task.menu.next_monday",
  nextWeekSameDay: "task.menu.next_week",
  delete: "task.menu.delete",
};

const ICONS: Record<DropAction, React.ComponentType<{ size?: number; className?: string }>> = {
  nextMonday: CalendarArrowUp,
  nextWeekSameDay: CalendarPlus,
  delete: Trash2,
};

interface ZoneProps {
  action: DropAction;
  hint: string | null;
}

const Zone: React.FC<ZoneProps> = ({ action, hint }) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_ZONE_PREFIX}${action}`,
    data: { type: "action", action },
  });
  const Icon = ICONS[action];
  const danger = action === "delete";

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold shadow-wp-pop transition-colors",
        danger
          ? isOver ? "border-wp-danger bg-wp-danger-soft text-wp-danger" : "border-wp-danger/50 bg-wp-card text-wp-danger"
          : isOver ? "border-wp-accent bg-wp-accent-soft text-wp-accent" : "border-wp-border-strong bg-wp-card text-wp-fg",
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span>{t(LABELS[action])}</span>
      {hint && <span className="text-xs font-medium text-wp-muted">{hint}</span>}
    </div>
  );
};

interface DropZonesProps {
  /** The task being dragged, as it was when the drag began; null when nothing is. */
  task: Task | null;
}

/**
 * Where a dragged task can be sent without opening anything: next Monday, a week later, or away.
 *
 * The menu's busiest entries, made reachable from the gesture already in progress — deleting a
 * task used to be a click, a menu and a click, where dragging it is one motion. Only there while
 * something is being dragged, so the board carries no extra furniture the rest of the time.
 *
 * A band over the top bar rather than over the days: a zone lying across a column's header would
 * be crossed on the way to that column, and the days are where most drags actually end. Delete is
 * set apart from the two moves, so a drop that misses a move by a little does not land on it.
 *
 * Each move shows the date it lands on, as the menu does, and is offered on the same terms: a
 * task with no week has no "same day next week" to go to, and a Monday task's is next Monday.
 */
const DropZones: React.FC<DropZonesProps> = ({ task }) => {
  const { t } = useTranslation();
  const dayjs = useDayJs();
  const { settings: { weekStartsOn } } = useSettings();
  const { dateOf } = useCalendar();

  if (!task) {
    return null;
  }

  const now = dayjs();
  const lands = (move: "nextMonday" | "nextWeekSameDay") => JSON.stringify(moveTarget(task, move, now, weekStartsOn));
  const moves = availableMoves(task, now, weekStartsOn)
    .filter((move): move is "nextMonday" | "nextWeekSameDay" => move === "nextMonday" || move === "nextWeekSameDay")
    // A Monday task's "same day next week" is next Monday: one zone for one destination.
    .filter((move) => move === "nextMonday" || lands(move) !== lands("nextMonday"));

  return (
    <div
      // Over the dragged card as well as the bar (dnd-kit's overlay sits at 999): a card hiding
      // the zone it is over would hide the one sign that letting go there does something.
      className="fixed inset-x-0 top-0 z-[1000] flex justify-center gap-6 border-b border-wp-border bg-wp-chrome px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2"
      role="group"
      aria-label={t("task.drop.zones")}
    >
      <div className="flex gap-2">
        {moves.map((move) => (
          <Zone key={move} action={move} hint={moveDate(task, move, now, dateOf)?.format("D MMM") ?? null} />
        ))}
      </div>
      <Zone action="delete" hint={null} />
    </div>
  );
};

export default DropZones;
