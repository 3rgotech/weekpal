import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import CategoryModal from "../CategoryModal";
import Category from "../../data/category";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const data = {
    categories: [] as Category[],
    // Typed on purpose: an untyped `jest.fn()` gives `mock.calls` an empty tuple, so every
    // assertion about what was saved reads as an error rather than as a check.
    saveCategory: jest.fn(async (_category: Category) => undefined),
    deleteCategory: jest.fn(async (_category: Category) => undefined),
};

jest.mock("../../contexts/DataContext", () => ({ useData: () => data }));

const category = (id: string, name: string, color = "sky") =>
    new Category({ id, name, color });

const open = () => render(<CategoryModal isOpen onOpenChange={() => { }} />);

const nameFields = () => screen.getAllByLabelText("category.name") as HTMLInputElement[];

beforeEach(() => {
    jest.clearAllMocks();
    data.categories = [category("work", "Work"), category("hobby", "Hobby", "lime")];
});

describe("the category editor", () => {
    it("lists every category with its name and colour", () => {
        open();

        expect(nameFields().map((field) => field.value)).toEqual(["Work", "Hobby"]);
        // The chosen colour is the checked radio in that row's picker.
        const pickers = screen.getAllByRole("radiogroup");
        expect(pickers).toHaveLength(2);
        expect(screen.getAllByRole("radio", { checked: true }).map((r) => r.getAttribute("aria-label")))
            .toEqual(["sky", "lime"]);
    });

    it("saves a rename", async () => {
        open();

        fireEvent.change(nameFields()[0], { target: { value: "Client work" } });
        fireEvent.click(screen.getByText("actions.save"));

        await waitFor(() => expect(data.saveCategory).toHaveBeenCalledTimes(1));

        const saved = data.saveCategory.mock.calls[0][0];
        expect(saved.id).toBe("work");
        expect(saved.name).toBe("Client work");
        expect(saved.color).toBe("sky");
    });

    it("saves a recolour", async () => {
        open();

        const rowColours = screen.getAllByRole("radiogroup")[0];
        fireEvent.click(within(rowColours).getByLabelText("rose"));
        fireEvent.click(screen.getByText("actions.save"));

        await waitFor(() => expect(data.saveCategory).toHaveBeenCalledTimes(1));
        expect(data.saveCategory.mock.calls[0][0].color).toBe("rose");
    });

    it("writes only the rows that changed", async () => {
        // Every row is in the form, but a save that rewrote all of them would queue a sync per
        // category and touch rows nobody edited.
        open();

        fireEvent.change(nameFields()[1], { target: { value: "Hobbies" } });
        fireEvent.click(screen.getByText("actions.save"));

        await waitFor(() => expect(data.saveCategory).toHaveBeenCalledTimes(1));
        expect(data.saveCategory.mock.calls[0][0].id).toBe("hobby");
    });

    it("adds a category with an id of its own", async () => {
        open();

        fireEvent.click(screen.getByText("category.add"));
        fireEvent.change(nameFields()[2], { target: { value: "Study" } });
        fireEvent.click(screen.getByText("actions.save"));

        await waitFor(() => expect(data.saveCategory).toHaveBeenCalledTimes(1));

        const saved = data.saveCategory.mock.calls[0][0];
        expect(saved.name).toBe("Study");
        expect(saved.id).toBeTruthy();
        expect(["work", "hobby"]).not.toContain(saved.id);
    });

    it("drops an unnamed row instead of storing it", async () => {
        // A category with no name cannot be told from any other on a board that names them.
        open();

        fireEvent.click(screen.getByText("category.add"));
        fireEvent.click(screen.getByText("actions.save"));

        await waitFor(() => expect(screen.queryByText("category.add")).not.toBeNull());
        expect(data.saveCategory).not.toHaveBeenCalled();
    });

    it("deletes a stored category through the context", async () => {
        open();

        fireEvent.click(screen.getAllByLabelText("category.delete")[1]);

        await waitFor(() => expect(data.deleteCategory).toHaveBeenCalledTimes(1));
        expect(data.deleteCategory.mock.calls[0][0].id).toBe("hobby");
    });

    it("removes an unsaved row without asking the server to delete it", async () => {
        open();

        fireEvent.click(screen.getByText("category.add"));
        expect(nameFields()).toHaveLength(3);

        fireEvent.click(screen.getAllByLabelText("category.delete")[2]);

        await waitFor(() => expect(nameFields()).toHaveLength(2));
        expect(data.deleteCategory).not.toHaveBeenCalled();
    });
});
