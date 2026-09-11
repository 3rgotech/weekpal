import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import React from "react";
import VirtualTaskList from "../VirtualTaskList";
import { SomedayTask } from "../../data/task";

const scrollToIndex = jest.fn((_index: number, _options?: unknown) => undefined);
const measure = jest.fn();

/** Whatever the component last asked the virtualiser for. */
let options: any = null;

/*
 * Stubbed rather than driven: jsdom gives the scroll element no height, so the real virtualiser
 * mounts nothing and there is no window to assert against. The stub hands back the first few rows
 * of whatever count it was given, which is enough to see how the component divides the column up
 * and what it puts in each row.
 */
jest.mock("@tanstack/react-virtual", () => ({
    useVirtualizer: (given: any) => {
        options = given;

        return {
            getTotalSize: () => 0,
            getVirtualItems: () => Array.from(
                { length: Math.min(given.count, 3) },
                (_, index) => ({ index, key: given.getItemKey(index), start: index * 50 }),
            ),
            measureElement: () => undefined,
            scrollToIndex,
            measure,
        };
    },
}));

const shortcuts = { activeTaskId: null as string | null };

jest.mock("../../contexts/ShortcutsContext", () => ({ useShortcuts: () => shortcuts }));

const tasks = Array.from({ length: 300 }, (_, i) => new SomedayTask({ id: `t${i}`, title: `Task ${i}` }));

const list = (columns?: number, only = tasks) => render(
    <VirtualTaskList
        tasks={only}
        scrollRef={{ current: null }}
        columns={columns}
        renderTask={(task) => <span>{task.title}</span>}
    />,
);

beforeEach(() => {
    jest.clearAllMocks();
    shortcuts.activeTaskId = null;
    options = null;
});

describe("what gets windowed", () => {
    it("windows one card per row in a single file", () => {
        // A day column, and the phone. Unchanged.
        list(1);

        expect(options.count).toBe(300);
        expect(screen.getAllByTestId("virtual-row")[0].textContent).toBe("Task 0");
    });

    it("windows rows of three where the grid puts three across", () => {
        // Rows, not cards. Windowing cards would mean each one carrying its own absolute
        // position — a grid re-implemented by hand, and the wrapping order the drag depends on
        // is exactly what the real grid gives for free.
        list(3);

        expect(options.count).toBe(100);
    });

    it("fills each row left to right, which is the order the list is read in", () => {
        list(3);

        const rows = screen.getAllByTestId("virtual-row");

        expect(rows[0].textContent).toBe("Task 0Task 1Task 2");
        expect(rows[1].textContent).toBe("Task 3Task 4Task 5");
    });

    it("leaves a short last row short rather than padding it", () => {
        list(3, tasks.slice(0, 4));

        const rows = screen.getAllByTestId("virtual-row");

        expect(options.count).toBe(2);
        expect(rows).toHaveLength(2);
        expect(rows[1].textContent).toBe("Task 3");
    });

    it("treats a nonsense column count as a single file", () => {
        // A grid that has not laid out yet reports nothing useful. One column is always a correct
        // layout; zero is a division by zero and an infinite row count.
        list(0);

        expect(options.count).toBe(300);
    });

    it("lays a row out as a grid only when there is more than one card in it", () => {
        const { container } = list(1);

        expect((container.querySelector("[data-testid='virtual-row']") as HTMLElement).style.display)
            .not.toBe("grid");
    });

    it("spans the whole grid rather than sitting in one cell of it", () => {
        // The rows inside position themselves absolutely, so the windowed list has to own the
        // full width — in one cell of a three-column grid it would be a third as wide.
        const { container } = list(3);

        expect(container.querySelector("[data-testid='virtual-list']")?.className)
            .toContain("col-span-full");
    });
});

describe("re-measuring", () => {
    it("forgets its row heights when the window crosses a breakpoint", () => {
        // Every cached height was measured for a row of the old width holding the old number of
        // cards. Keeping them places new rows against measurements of rows that no longer exist.
        const { rerender } = list(3);

        // Nothing cached to forget on the mount itself, and the virtualiser has measured nothing
        // yet — throwing that away would be work for its own sake.
        expect(measure).not.toHaveBeenCalled();

        rerender(
            <VirtualTaskList
                tasks={tasks}
                scrollRef={{ current: null }}
                columns={2}
                renderTask={(task) => <span>{task.title}</span>}
            />,
        );

        expect(measure).toHaveBeenCalled();
    });

    it("does not re-measure on an ordinary re-render", () => {
        const { rerender } = list(3);

        rerender(
            <VirtualTaskList
                tasks={[...tasks]}
                scrollRef={{ current: null }}
                columns={3}
                renderTask={(task) => <span>{task.title}</span>}
            />,
        );

        expect(measure).not.toHaveBeenCalled();
    });
});

describe("keyboard selection in a windowed column", () => {
    it("brings a selected row that is not mounted into view", () => {
        // `j` and `k` walk every task in the column, not the handful on screen. A row far down
        // has no element of its own to scroll to, so without this the selection moves somewhere
        // invisible and stays there.
        shortcuts.activeTaskId = "t200";

        list(1);

        expect(scrollToIndex).toHaveBeenCalledWith(200, { align: "auto" });
    });

    it("asks for the row the task is in, not its place in the column", () => {
        // With three cards across, the two-hundredth task is on the sixty-seventh row.
        shortcuts.activeTaskId = "t200";

        list(3);

        expect(scrollToIndex).toHaveBeenCalledWith(66, { align: "auto" });
    });

    it("asks for nothing while there is no selection", () => {
        list(1);

        expect(scrollToIndex).not.toHaveBeenCalled();
    });

    it("ignores a selection that belongs to another column", () => {
        // Every column runs this; only the one holding the task should move.
        shortcuts.activeTaskId = "a-task-in-tuesday";

        list(1);

        expect(scrollToIndex).not.toHaveBeenCalled();
    });

    it("does not chase the list on an ordinary re-render", () => {
        // `tasks` is rebuilt every render of the column. Depending on it would re-run this
        // continuously and yank the list back under anyone scrolling it by hand.
        shortcuts.activeTaskId = "t200";

        const { rerender } = list(1);
        expect(scrollToIndex).toHaveBeenCalledTimes(1);

        rerender(
            <VirtualTaskList
                tasks={[...tasks]}
                scrollRef={{ current: null }}
                columns={1}
                renderTask={(task) => <span>{task.title}</span>}
            />,
        );

        expect(scrollToIndex).toHaveBeenCalledTimes(1);
    });
});

describe("row identity", () => {
    it("keys a row off its first card, so inserting one does not remount the column", () => {
        list(3);

        expect(options.getItemKey(0)).toBe("t0");
        expect(options.getItemKey(1)).toBe("t3");
    });
});
