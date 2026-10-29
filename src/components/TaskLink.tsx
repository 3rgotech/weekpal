import { useEffect, useState } from "react";
import { useData } from "../contexts/DataContext";
import { useCalendar } from "../contexts/CalendarContext";
import { useTaskModal } from "../contexts/TaskModalContext";

/** The query parameter a task reminder's push links to the board with. */
export const TASK_PARAM = "task";

/** The task id in a board URL, if it carries one. */
export const taskIdFrom = (url: string): string | null => new URL(url, window.location.origin).searchParams.get(TASK_PARAM);

/**
 * Opens the task a reminder pointed at.
 *
 * Renders nothing. Two ways in: the board loaded from the push, with `?task=` in its address, or a
 * board already open, which the service worker tells rather than reloads. Either way the board goes
 * to this week — a reminder is always for today — and opens the task once its week has loaded.
 *
 * The parameter leaves the address at once, so a reload does not open the task a second time.
 */
const TaskLink: React.FC = () => {
    const { findTask, tasks } = useData();
    const { goToToday } = useCalendar();
    const { open } = useTaskModal();

    const [pending, setPending] = useState<string | null>(() => taskIdFrom(window.location.href));

    useEffect(() => {
        const url = new URL(window.location.href);

        if (url.searchParams.has(TASK_PARAM)) {
            url.searchParams.delete(TASK_PARAM);
            window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        }

        const worker = navigator.serviceWorker;
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === "weekpal:open" && typeof event.data.url === "string") {
                const id = taskIdFrom(event.data.url);

                if (id) {
                    goToToday();
                    setPending(id);
                }
            }
        };

        worker?.addEventListener("message", onMessage);

        return () => worker?.removeEventListener("message", onMessage);
    }, []);

    useEffect(() => {
        if (!pending) {
            return;
        }

        const task = findTask(pending);

        if (task) {
            open(task);
            setPending(null);
        }
    }, [pending, tasks]);

    // A task that never turns up — deleted since, or moved out of this week — is let go of
    // rather than opened by surprise whenever it next appears.
    useEffect(() => {
        if (!pending) {
            return;
        }

        const timer = window.setTimeout(() => setPending(null), 15000);

        return () => window.clearTimeout(timer);
    }, [pending]);

    return null;
};

export default TaskLink;
