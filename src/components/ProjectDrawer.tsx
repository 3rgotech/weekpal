import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useData } from "../contexts/DataContext";
import Project from "../data/project";
import Task from "../data/task";
import DraggableTask from "./DraggableTask";
import IconButton from "./IconButton";

/**
 * The projects drawer: custom lists and their backlogs, beside the week.
 *
 * A backlog is the tasks in a project that have no week yet. They sit inside the board's existing
 * `DndContext`, so one can be dragged straight out of a list and onto a day — which is the whole
 * point of putting them here rather than on a separate page.
 *
 * Backlogs load when a project is expanded, not with the drawer: the week payload deliberately
 * leaves them out so a long backlog is not refetched with every week, and the same reasoning
 * applies to opening the drawer.
 */
const ProjectDrawer: React.FC = () => {
    const { t } = useTranslation();
    const { projects, projectStore, saveProject, deleteProject, categories } = useData();

    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [backlogs, setBacklogs] = useState<Record<string, Task[]>>({});
    const [draft, setDraft] = useState("");

    const loadBacklog = useCallback(async (projectId: string) => {
        if (!projectStore) {
            return;
        }

        const tasks = await projectStore.backlog(projectId);
        setBacklogs((prev) => ({ ...prev, [projectId]: tasks }));
    }, [projectStore]);

    useEffect(() => {
        if (expanded !== null) {
            loadBacklog(expanded);
        }
    }, [expanded, loadBacklog]);

    const addProject = async () => {
        const name = draft.trim();
        if (name === "") {
            return;
        }

        setDraft("");
        await saveProject(new Project({ name, categoryId: null }));
    };

    if (!open) {
        return (
            <div className="flex-none border-l border-slate-200 dark:border-slate-600 p-2">
                <IconButton
                    icon="chevronLeft"
                    size="sm"
                    tooltip={t("projects.show")}
                    tooltipPosition="left"
                    onClick={() => setOpen(true)}
                />
            </div>
        );
    }

    return (
        <aside className="flex-none w-72 flex flex-col border-l border-slate-200 dark:border-slate-600 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-600">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                    {t("projects.title")}
                </h2>
                <IconButton
                    icon="chevronRight"
                    size="sm"
                    tooltip={t("projects.hide")}
                    onClick={() => setOpen(false)}
                />
            </div>

            <div className="flex-1 flex flex-col gap-1 p-2">
                {projects.length === 0 && (
                    <p className="px-1 py-2 text-xs text-slate-500 dark:text-slate-400">
                        {t("projects.empty")}
                    </p>
                )}

                {projects.map((project) => {
                    const category = categories.find((c) => c.id === project.categoryId);
                    const isExpanded = expanded === project.id;
                    const tasks = backlogs[project.id] ?? [];

                    return (
                        <div key={project.id} className="flex flex-col">
                            <button
                                type="button"
                                className="flex items-center gap-1 px-1 py-1.5 text-sm text-left rounded hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-white"
                                onClick={() => setExpanded(isExpanded ? null : project.id)}
                                aria-expanded={isExpanded}
                            >
                                {isExpanded
                                    ? <ChevronDown size={14} className="shrink-0" />
                                    : <ChevronRight size={14} className="shrink-0" />}

                                {category && (
                                    <span
                                        className={clsx("w-2 h-2 rounded-full shrink-0", category.getColorClass("bg"))}
                                        aria-hidden="true"
                                    />
                                )}

                                <span className="truncate">{project.name}</span>
                            </button>

                            {isExpanded && (
                                <div className="pl-4">
                                    {tasks.length === 0 ? (
                                        <p className="px-1 py-1 text-xs text-slate-400">
                                            {t("projects.no_tasks")}
                                        </p>
                                    ) : (
                                        <ul>
                                            {tasks.map((task) => (
                                                <DraggableTask key={task.id} task={task} />
                                            ))}
                                        </ul>
                                    )}

                                    <div className="flex items-center gap-2 py-2">
                                        <Select
                                            size="sm"
                                            aria-label={t("projects.category")}
                                            placeholder={t("projects.no_category")}
                                            selectedKeys={project.categoryId ? [project.categoryId] : []}
                                            onSelectionChange={(keys) => {
                                                // A project's category is the authority for every
                                                // task in it — the backend cascades the change
                                                // rather than letting a task disagree.
                                                project.categoryId = ([...keys][0] as string) ?? null;
                                                saveProject(project);
                                            }}
                                        >
                                            {categories.map((option) => (
                                                <SelectItem key={option.id} className="dark:text-white">
                                                    {option.name}
                                                </SelectItem>
                                            ))}
                                        </Select>

                                        <IconButton
                                            icon="trash"
                                            size="xs"
                                            tooltip={t("projects.delete")}
                                            onClick={() => {
                                                deleteProject(project);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2 p-2 border-t border-slate-200 dark:border-slate-600">
                <Input
                    size="sm"
                    aria-label={t("projects.add")}
                    placeholder={t("projects.placeholder")}
                    value={draft}
                    onValueChange={setDraft}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            addProject();
                        }
                    }}
                />
                <Button size="sm" color="primary" isDisabled={draft.trim() === ""} onPress={addProject}>
                    {t("projects.add")}
                </Button>
            </div>
        </aside>
    );
};

export default ProjectDrawer;
