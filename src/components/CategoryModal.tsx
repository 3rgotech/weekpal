import React, { useEffect, useState } from "react";
import { Button, Input, Label, Modal, TextField } from "@heroui/react";
import { Check, Plus, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useData } from "../contexts/DataContext";
import Category from "../data/category";
import { CategoryColor } from "../types";
import { COLORS } from "../utils/color";
import { newId } from "../utils/id";
import IconButton from "./IconButton";

interface CategoryModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const COLOR_NAMES = Object.keys(COLORS) as CategoryColor[];

/** One row's worth of edits, held locally until it is saved. */
interface Draft {
    id: string;
    name: string;
    color: CategoryColor;
    /** True for a row added here that has never been saved. */
    isNew: boolean;
}

const toDraft = (category: Category): Draft => ({
    id: category.id,
    name: category.name,
    color: category.color,
    isNew: false,
});

/**
 * Where categories are created, renamed, recoloured and deleted.
 *
 * Until now there was nowhere: `DataContext` only ever listed categories, so a category could be
 * created by the seed or the API and then never touched again from the board.
 *
 * Every row at once rather than a dialog per category. Categories are a short list that is read
 * as a set — the colours have to be told apart from each other — and renaming three of them
 * should not be three trips through a modal.
 *
 * Edits are local until saved. A name is a text field being typed into, and writing every
 * keystroke through the store would queue a sync per character and repaint the board under the
 * cursor.
 */
const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const { categories, saveCategory, deleteCategory } = useData();

    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [busy, setBusy] = useState(false);

    // Re-seeded each time it opens, so a modal closed on half-finished edits does not reopen
    // holding them — and so a category changed on another device shows up rather than being
    // overwritten by a stale row.
    useEffect(() => {
        if (isOpen) {
            setDrafts(categories.map(toDraft));
        }
    }, [isOpen, categories]);

    const edit = (id: string, changes: Partial<Draft>) => {
        setDrafts((current) => current.map(
            (draft) => (draft.id === id ? { ...draft, ...changes } : draft),
        ));
    };

    const add = () => {
        setDrafts((current) => [
            ...current,
            { id: newId(), name: "", color: COLOR_NAMES[current.length % COLOR_NAMES.length], isNew: true },
        ]);
    };

    const remove = async (draft: Draft) => {
        // A row that was never saved is only in this component; there is nothing to delete.
        if (draft.isNew) {
            setDrafts((current) => current.filter((held) => held.id !== draft.id));

            return;
        }

        const existing = categories.find((category) => category.id === draft.id);

        if (!existing) {
            return;
        }

        setBusy(true);
        await deleteCategory(existing);
        setBusy(false);
    };

    /**
     * Saves every row that has something to save, then closes.
     *
     * Rows with an empty name are dropped rather than stored: an unnamed category is
     * indistinguishable from every other unnamed one on a board that identifies them by name.
     */
    const save = async () => {
        setBusy(true);

        for (const draft of drafts) {
            const name = draft.name.trim();

            if (name === "") {
                continue;
            }

            const before = categories.find((category) => category.id === draft.id);

            if (before && before.name === name && before.color === draft.color) {
                continue;
            }

            await saveCategory(new Category({ id: draft.id, name, color: draft.color }));
        }

        setBusy(false);
        onOpenChange(false);
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop variant="blur">
                <Modal.Container size="lg" scroll="inside">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("category.edit_categories")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-3">
                            {drafts.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {t("category.empty")}
                                </p>
                            )}

                            {drafts.map((draft) => (
                                <div key={draft.id} className="flex items-start gap-3">
                                    {/* The picker is the sixteen colours themselves. A dropdown
                                        would name them, and nobody picks a category colour by
                                        reading the word "fuchsia". */}
                                    <div
                                        className="flex flex-wrap gap-1 w-40 shrink-0"
                                        role="radiogroup"
                                        aria-label={t("category.color")}
                                    >
                                        {COLOR_NAMES.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                role="radio"
                                                aria-checked={draft.color === color}
                                                aria-label={color}
                                                onClick={() => edit(draft.id, { color })}
                                                className={clsx(
                                                    "w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition",
                                                    COLORS[color].bg,
                                                    draft.color === color
                                                        ? "ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900"
                                                        : "opacity-60 hover:opacity-100",
                                                )}
                                            >
                                                {draft.color === color && (
                                                    <Check size={14} className="text-white" aria-hidden="true" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <TextField
                                        aria-label={t("category.name")}
                                        value={draft.name}
                                        onChange={(name: string) => edit(draft.id, { name })}
                                        className="flex-1 min-w-0"
                                    >
                                        <Input placeholder={t("category.placeholder")} />
                                    </TextField>

                                    <IconButton
                                        icon="trash"
                                        size="sm"
                                        tooltip={t("category.delete")}
                                        onClick={() => { void remove(draft); }}
                                        iconClass="text-red-600 dark:text-red-400"
                                    />
                                </div>
                            ))}

                            <div>
                                <Button variant="secondary" size="sm" onPress={add}>
                                    <Plus size={14} />
                                    {t("category.add")}
                                </Button>
                            </div>
                        </Modal.Body>

                        <Modal.Footer className="flex items-center justify-end gap-2">
                            <Button variant="secondary" onPress={() => onOpenChange(false)}>
                                {t("actions.cancel")}
                            </Button>
                            <Button variant="primary" isDisabled={busy} onPress={() => { void save(); }}>
                                {t("actions.save")}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default CategoryModal;
