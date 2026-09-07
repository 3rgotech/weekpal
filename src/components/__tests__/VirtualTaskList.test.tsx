import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react";
import React from "react";
import VirtualTaskList from "../VirtualTaskList";
import { SomedayTask } from "../../data/task";

const scrollToIndex = jest.fn((_index: number, _options?: unknown) => undefined);

// Stubbed rather than driven: jsdom gives the scroll element no height, so the real virtualiser
// mounts nothing and there is no window to assert against. What matters here is the wiring —
// which index the selection asks for.
jest.mock("@tanstack/react-virtual", () => ({
    useVirtualizer: () => ({
        getTotalSize: () => 0,
        getVirtualItems: () => [],
        measureElement: () => undefined,
        scrollToIndex,
    }),
}));

const shortcuts = { activeTaskId: null as string | null };

jest.mock("../../contexts/ShortcutsContext", () => ({ useShortcuts: () => shortcuts }));

const tasks = Array.from({ length: 300 }, (_, i) => new SomedayTask({ id: `t${i}`, title: `Task ${i}` }));

const list = () => render(
    <VirtualTaskList
        tasks={tasks}
        scrollRef={{ current: null }}
        renderTask={(task) => <span>{task.title}</span>}
    />,
);

beforeEach(() => {
    jest.clearAllMocks();
    shortcuts.activeTaskId = null;
});

describe("keyboard selection in a windowed column", () => {
    it("brings a selected row that is not mounted into view", () => {
        // `j` and `k` walk every task in the column, not the handful on screen. A row far down
        // has no element of its own to scroll to, so without this the selection moves somewhere
        // invisible and stays there.
        shortcuts.activeTaskId = "t200";

        list();

        expect(scrollToIndex).toHaveBeenCalledWith(200, { align: "auto" });
    });

    it("asks for nothing while there is no selection", () => {
        list();

        expect(scrollToIndex).not.toHaveBeenCalled();
    });

    it("ignores a selection that belongs to another column", () => {
        // Every column runs this; only the one holding the task should move.
        shortcuts.activeTaskId = "a-task-in-tuesday";

        list();

        expect(scrollToIndex).not.toHaveBeenCalled();
    });

    it("does not chase the list on an ordinary re-render", () => {
        // `tasks` is rebuilt every render of the column. Depending on it would re-run this
        // continuously and yank the list back under anyone scrolling it by hand.
        shortcuts.activeTaskId = "t200";

        const { rerender } = list();
        expect(scrollToIndex).toHaveBeenCalledTimes(1);

        rerender(
            <VirtualTaskList
                tasks={[...tasks]}
                scrollRef={{ current: null }}
                renderTask={(task) => <span>{task.title}</span>}
            />,
        );

        expect(scrollToIndex).toHaveBeenCalledTimes(1);
    });
});
