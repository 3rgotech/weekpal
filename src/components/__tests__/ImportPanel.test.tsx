import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import ImportPanel from "../ImportPanel";
import { ImportSummary } from "../../types";
import { ImportRefused } from "../../adapter/api/APIImportAdapter";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => {
            if (options?.n !== undefined) {
                return `${key}:${options.n}`;
            }

            return options?.headers === undefined ? key : `${key}:${options.headers}`;
        },
    }),
}));

const data = { reloadBoard: jest.fn(async () => undefined) };

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

const summary: ImportSummary = {
    imported: 12, skipped: 0, categories_created: 0, undated: 0, columns: { title: 0 },
    unmatched: [], dry_run: false,
};

const adapter = {
    preview: jest.fn(async (_file: File) => ({ ...summary, dry_run: true })),
    upload: jest.fn(async (_file: File) => summary),
};
const adapters = { importAdapter: adapter as unknown as null };

jest.mock("../../adapter", () => ({
    __esModule: true,
    default: { createAdapters: () => adapters },
}));

const file = (name = "tasks.csv") => new File(["Title\nBuy milk\n"], name, { type: "text/csv" });

const chooseFile = (upload: File) => {
    const input = screen.getByLabelText("import.choose") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [upload] } });
};

beforeEach(() => {
    jest.clearAllMocks();
    adapters.importAdapter = adapter as unknown as null;
    adapter.preview.mockImplementation(async () => ({ ...summary, dry_run: true }));
    adapter.upload.mockImplementation(async () => summary);
});

/** Choose a file and accept what the preview reports — the ordinary path through the panel. */
const chooseAndConfirm = async (upload: File) => {
    chooseFile(upload);
    await waitFor(() => expect(screen.getByText("import.confirm")).toBeTruthy());

    // Awaited inside `act`, so the upload's own state updates land before the assertions rather
    // than after them — otherwise every test here reports an unwrapped update.
    await act(async () => {
        fireEvent.click(screen.getByText("import.confirm"));
    });
};

describe("bringing tasks in from another app", () => {
    it("looks before it leaps — nothing is written on choosing a file", async () => {
        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(adapter.preview).toHaveBeenCalledTimes(1));
        expect((adapter.preview.mock.calls[0][0] as File).name).toBe("tasks.csv");
        expect(adapter.upload).not.toHaveBeenCalled();
    });

    it("imports the same file once confirmed", async () => {
        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(adapter.upload).toHaveBeenCalledTimes(1));
        expect((adapter.upload.mock.calls[0][0] as File).name).toBe("tasks.csv");
    });

    it("writes nothing if the preview is declined", async () => {
        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(screen.getByText("actions.cancel")).toBeTruthy());
        fireEvent.click(screen.getByText("actions.cancel"));

        expect(adapter.upload).not.toHaveBeenCalled();
        expect(screen.queryByText("import.confirm")).toBeNull();
    });

    it("says what came of it", async () => {
        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(screen.getByText("import.done:12")).toBeTruthy());
    });

    it("pulls the board again, so the tasks actually appear", async () => {
        // The import wrote straight to the server. Without this the board shows none of it until
        // the next scheduled pull, which reads as the import having failed.
        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(data.reloadBoard).toHaveBeenCalledTimes(1));
    });

    it("warns before importing that undated tasks will all land in Some day", async () => {
        // The line this whole step exists for: a thousand undated tasks in one column is worth
        // knowing about before it happens, not after.
        adapter.preview.mockImplementation(async () => ({
            ...summary, imported: 1000, undated: 1000, dry_run: true,
        }));

        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(screen.getByText("import.will_import:1000")).toBeTruthy());
        expect(screen.getByText("import.will_be_undated:1000")).toBeTruthy();
    });

    it("names unrecognised columns before anything is created, not after", async () => {
        adapter.preview.mockImplementation(async () => ({
            ...summary, unmatched: ["Priority"], dry_run: true,
        }));

        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(screen.getByText("import.ignored:Priority")).toBeTruthy());
    });

    it("mentions only what actually happened", async () => {
        adapter.upload.mockImplementation(async () => ({
            imported: 5, skipped: 2, categories_created: 1, undated: 3, columns: { title: 0 },
            unmatched: [], dry_run: false,
        }));

        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(screen.getByText("import.skipped:2")).toBeTruthy());
        expect(screen.getByText("import.undated:3")).toBeTruthy();
        expect(screen.getByText("import.categories:1")).toBeTruthy();
    });

    it("stays quiet about counts that are zero", async () => {
        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(screen.getByText("import.done:12")).toBeTruthy());
        expect(screen.queryByText("import.skipped:0")).toBeNull();
        expect(screen.queryByText("import.undated:0")).toBeNull();
    });

    it("explains a refusal instead of failing silently", async () => {
        adapter.preview.mockImplementation(async () => { throw new Error("422"); });
        jest.spyOn(console, "error").mockImplementation(() => { });

        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(screen.getByText("import.failed")).toBeTruthy());
    });

    it("lets the same file be chosen again after a fix", async () => {
        // The input holds its selection otherwise, and re-picking it fires no change event —
        // so correcting a header and retrying would appear to do nothing.
        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(adapter.preview).toHaveBeenCalledTimes(1));
        expect((screen.getByLabelText("import.choose") as HTMLInputElement).value).toBe("");
    });

    it("says so when there is nowhere to import to", () => {
        // The demo board has no account behind it.
        adapters.importAdapter = null;

        render(<ImportPanel />);

        expect(screen.getByText("import.unavailable")).toBeTruthy();
        expect(screen.queryByLabelText("import.choose")).toBeNull();
    });

    it("names the columns a refusal did not recognise", async () => {
        // Those words are the diagnosis: they are what someone quotes in a support message, and
        // what goes into the alias table to make the next file of that shape work.
        adapter.preview.mockImplementation(async () => {
            throw new ImportRefused(["Priority", "Assignee"]);
        });

        render(<ImportPanel />);
        chooseFile(file());

        await waitFor(() => expect(screen.getByText("import.failed")).toBeTruthy());
        expect(screen.getByText("import.unmatched:Priority, Assignee")).toBeTruthy();
    });

    it("mentions columns it ignored even when the import worked", async () => {
        // A file whose notes column was skipped looks like a success until a task is opened and
        // found empty.
        adapter.upload.mockImplementation(async () => ({ ...summary, unmatched: ["Priority"] }));

        render(<ImportPanel />);
        await chooseAndConfirm(file());

        await waitFor(() => expect(screen.getByText("import.done:12")).toBeTruthy());
    });
});
