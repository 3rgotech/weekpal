import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useData } from "./DataContext";
import { useSettings } from "./SettingsContext";
import { useCalendar } from "./CalendarContext";
import { useTaskModal } from "./TaskModalContext";
import Task from "../data/task";
import LeftoverReview from "../components/LeftoverReview";
import ShortcutsHelp from "../components/ShortcutsHelp";
import { boardOrder, deferTarget, isTypingTarget, nextTask } from "../utils/shortcuts";

interface ShortcutsContextProps {
    /** The task the keyboard is pointed at, or null when the board has no selection. */
    activeTaskId: string | null;
    setActiveTaskId: (taskId: string | null) => void;
    openHelp: () => void;
    /** The review of what was left behind, which `i` opens and Escape closes. */
    leftoversOpen: boolean;
    setLeftoversOpen: (open: boolean) => void;
    /** The projects drawer beside the week, which `p` opens and closes. */
    projectsOpen: boolean;
    setProjectsOpen: (open: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextProps | undefined>(undefined);

/**
 * Keyboard control of the board.
 *
 * One selection and one global listener, rather than per-task handlers: the keys act on whatever
 * is selected, and a task card that had to be focused first would mean tabbing through the week
 * to reach the one you can see. `j`/`k` move the selection, and the rest act on it or on the
 * board around it.
 *
 * The panels those keys open live here too — the review and the projects drawer. They were state
 * in `App` and state inside the drawer respectively, neither of which a key handler can reach;
 * held here, the button and the keystroke drive the same thing.
 *
 * The listener stands down whenever the keystroke belongs to something else — text being typed, a
 * modifier held for a browser shortcut, or a dialog being open, which has its own fields and its
 * own Escape.
 */
const ShortcutsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { tasks, completeTask, uncompleteTask, relocateTask, toggleFocusCategory } = useData();
    const { settings, updateSettings } = useSettings();
    const { currentWeek, goToPreviousWeek, goToNextWeek, goToToday } = useCalendar();
    const { openNewTask, isOpen: taskModalIsOpen } = useTaskModal();

    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [leftoversOpen, setLeftoversOpen] = useState(false);
    const [projectsOpen, setProjectsOpen] = useState(false);

    // What the keys can reach is exactly what the board is showing: the category filter has
    // already been applied to `tasks`, and completed tasks are skipped when they are hidden.
    const ordered = useMemo(
        () => boardOrder(tasks.filter((task) => settings.showCompletedTasks || !task.completed)),
        [tasks, settings.showCompletedTasks],
    );

    // A selected task that has been filtered away, completed out of sight or deleted would
    // otherwise leave the keys acting on something nobody can see.
    useEffect(() => {
        if (activeTaskId !== null && !ordered.some((task) => task.id === activeTaskId)) {
            setActiveTaskId(null);
        }
    }, [ordered, activeTaskId]);

    useEffect(() => {
        const active = (): Task | null => ordered.find((task) => task.id === activeTaskId) ?? null;

        const move = (direction: 1 | -1) => {
            const target = nextTask(ordered, activeTaskId, direction);

            if (target) {
                setActiveTaskId(target.id);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            // Ctrl/⌘/Alt combinations belong to the browser and the operating system — printing
            // among them, which is why the sheet names ⌘P rather than binding it.
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (isTypingTarget(event.target)) {
                return;
            }

            if (event.key === "Escape") {
                // Only the help sheet is closed from here. The review is a modal that closes
                // itself on Escape, and doing it for it would skip the "seen this week" mark it
                // writes on the way out.
                if (helpOpen) {
                    setHelpOpen(false);
                }
                return;
            }

            // While a dialog is up, the board is not what the keys are aimed at.
            if (helpOpen || taskModalIsOpen || leftoversOpen) {
                return;
            }

            const task = active();

            switch (event.key) {
                case "j":
                    event.preventDefault();
                    move(1);
                    return;
                case "k":
                    event.preventDefault();
                    move(-1);
                    return;
                case "?":
                    event.preventDefault();
                    setHelpOpen(true);
                    return;
                case "v":
                    event.preventDefault();
                    updateSettings({ showCompletedTasks: !settings.showCompletedTasks });
                    return;
                case "i":
                    event.preventDefault();
                    setLeftoversOpen(true);
                    return;
                case "p":
                    event.preventDefault();
                    setProjectsOpen(!projectsOpen);
                    return;
                case "t":
                    event.preventDefault();
                    goToToday();
                    return;
                case "ArrowLeft":
                    event.preventDefault();
                    goToPreviousWeek();
                    return;
                case "ArrowRight":
                    event.preventDefault();
                    goToNextWeek();
                    return;
                case "n": {
                    event.preventDefault();
                    // Into the day being looked at, which is the one the selection is in.
                    const day = task ? task.dayOfWeek : "0";
                    openNewTask(currentWeek, day);
                    return;
                }
                case " ": {
                    if (!task) {
                        return;
                    }
                    // Otherwise the page scrolls under the board as well as ticking the task.
                    event.preventDefault();
                    if (task.completed) {
                        uncompleteTask(task);
                    } else {
                        completeTask(task);
                    }
                    return;
                }
                case "d": {
                    const target = task ? deferTarget(task) : null;
                    if (!task || !target) {
                        return;
                    }
                    event.preventDefault();
                    void relocateTask(task, target);
                    return;
                }
                case "c": {
                    if (!task || !task.categoryId) {
                        return;
                    }
                    event.preventDefault();
                    toggleFocusCategory(task.categoryId);
                    return;
                }
                default:
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [
        ordered,
        activeTaskId,
        helpOpen,
        taskModalIsOpen,
        leftoversOpen,
        projectsOpen,
        settings.showCompletedTasks,
        currentWeek,
        openNewTask,
        completeTask,
        uncompleteTask,
        relocateTask,
        toggleFocusCategory,
        updateSettings,
        goToPreviousWeek,
        goToNextWeek,
        goToToday,
    ]);

    return (
        <ShortcutsContext.Provider
            value={{
                activeTaskId,
                setActiveTaskId,
                openHelp: () => setHelpOpen(true),
                leftoversOpen,
                setLeftoversOpen,
                projectsOpen,
                setProjectsOpen,
            }}
        >
            {children}
            <ShortcutsHelp isOpen={helpOpen} onOpenChange={setHelpOpen} />
            <LeftoverReview isOpen={leftoversOpen} onOpenChange={setLeftoversOpen} />
        </ShortcutsContext.Provider>
    );
};

/**
 * Optional on purpose: `PrintSheet` and the tests render task rows outside the provider, and a
 * card that throws when nothing is listening for keys would take the printed week with it.
 */
const useShortcuts = (): ShortcutsContextProps => useContext(ShortcutsContext) ?? {
    activeTaskId: null,
    setActiveTaskId: () => { },
    openHelp: () => { },
    leftoversOpen: false,
    setLeftoversOpen: () => { },
    projectsOpen: false,
    setProjectsOpen: () => { },
};

export { ShortcutsContext, ShortcutsProvider, useShortcuts };
