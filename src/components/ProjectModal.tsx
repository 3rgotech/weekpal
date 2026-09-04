import React, { useEffect, useState } from "react";
import { Button, Input, Label, ListBox, Modal, Select, TextField } from "@heroui/react";
import type { Key } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { useData } from "../contexts/DataContext";
import Project from "../data/project";

interface ProjectModalProps {
    /** The project being edited, or null to create one. */
    project: Project | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Making a project, and changing one.
 *
 * Both were inline in the drawer: a text field and a submit button crammed into a 288px column,
 * which overflowed its own edge, and a category select that sat under a project's task list and
 * saved on every keystroke of a dropdown. Neither is a thing you do often enough to earn
 * permanent space beside the week, so both are a dialog with a save button — and the name and
 * the category are set in the same place rather than at opposite ends of the drawer.
 */
const ProjectModal: React.FC<ProjectModalProps> = ({ project, isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const { categories, saveProject, deleteProject } = useData();

    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);

    // Reloaded whenever the dialog is pointed at something else, including at nothing: a create
    // that follows an edit must not open holding the edited project's name.
    useEffect(() => {
        setName(project?.name ?? "");
        setCategoryId(project?.categoryId ?? null);
    }, [project, isOpen]);

    const save = async () => {
        const trimmed = name.trim();

        if (trimmed === "") {
            return;
        }

        if (project) {
            project.name = trimmed;
            project.categoryId = categoryId;
            await saveProject(project);
        } else {
            await saveProject(new Project({ name: trimmed, categoryId }));
        }

        onOpenChange(false);
    };

    const remove = async () => {
        if (!project) {
            return;
        }

        await deleteProject(project);
        onOpenChange(false);
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>
                                {project ? t("projects.edit") : t("projects.add")}
                            </Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-4">
                            <TextField
                                aria-label={t("projects.name")}
                                value={name}
                                onChange={setName}
                                autoFocus
                                onKeyDown={(event: React.KeyboardEvent) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void save();
                                    }
                                }}
                            >
                                <Label>{t("projects.name")}</Label>
                                <Input placeholder={t("projects.placeholder")} />
                            </TextField>

                            <Select
                                aria-label={t("projects.category")}
                                placeholder={t("projects.no_category")}
                                value={categoryId}
                                onChange={(key: Key | null) => setCategoryId(key === null ? null : String(key))}
                            >
                                <Label>{t("projects.category")}</Label>
                                <Select.Trigger>
                                    <Select.Value />
                                    <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                    <ListBox>
                                        {categories.map((category) => (
                                            <ListBox.Item
                                                key={category.id}
                                                id={category.id}
                                                textValue={category.name}
                                            >
                                                <Label>{category.name}</Label>
                                            </ListBox.Item>
                                        ))}
                                    </ListBox>
                                </Select.Popover>
                            </Select>

                            {/* A project's category is the authority for the tasks in it, so
                                changing it here is not a filter — it moves work. Said plainly,
                                rather than discovered afterwards. */}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {t("projects.category_help")}
                            </p>
                        </Modal.Body>

                        <Modal.Footer className="flex items-center justify-between gap-2">
                            {project ? (
                                <Button variant="danger" onPress={() => { void remove(); }}>
                                    {t("projects.delete")}
                                </Button>
                            ) : <span />}

                            <div className="flex items-center gap-2">
                                <Button variant="secondary" onPress={() => onOpenChange(false)}>
                                    {t("actions.cancel")}
                                </Button>
                                <Button variant="primary" isDisabled={name.trim() === ""} onPress={() => { void save(); }}>
                                    {t("actions.save")}
                                </Button>
                            </div>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default ProjectModal;
