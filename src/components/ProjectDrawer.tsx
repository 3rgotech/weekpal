import React, { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, PanelRightOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useData } from "../contexts/DataContext";
import Project from "../data/project";
import DraggableTask from "./DraggableTask";
import IconButton from "./IconButton";
import NewTask from "./NewTask";
import ProjectModal from "./ProjectModal";
import { projectMatchesFocus } from "../utils/categories";
import { useShortcuts } from "../contexts/ShortcutsContext";


interface ProjectRowProps {
    project: Project;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
}

/**
 * One project in the drawer: its name, and — while it is open — its backlog.
 *
 * A component of its own rather than a function inside the drawer, because it holds a droppable:
 * one declared inside a parent's body is a new component on every render, and dnd-kit would
 * register and forget the drop target under the pointer mid-drag.
 */
const ProjectRow: React.FC<ProjectRowProps> = ({ project, isExpanded, onToggle, onEdit }) => {
    const { t } = useTranslation();
    const { categories, backlogs } = useData();

    const category = categories.find((c) => c.id === project.categoryId);
    const tasks = backlogs[project.id] ?? [];
    // The loaded backlog once there is one — it follows every drag in and out — and the count the
    // project list arrived with until then.
    const waiting = project.id in backlogs
        ? tasks.filter((task) => !task.completed).length
        : project.backlogCount;

    // The list is a drop target whether or not it holds anything — an empty project is exactly
    // where a task most often wants to go.
    const { setNodeRef, isOver } = useDroppable({
        id: `project-${project.id}-droppable`,
        data: { type: "container", projectId: project.id },
    });

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    className="flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 text-[13px] font-semibold text-left rounded-md cursor-pointer text-wp-fg hover:bg-wp-track"
                    onClick={onToggle}
                    aria-expanded={isExpanded}
                >
                    {isExpanded
                        ? <ChevronDown size={14} className="shrink-0 text-wp-muted" />
                        : <ChevronRight size={14} className="shrink-0 text-wp-muted" />}

                    {category && (
                        <span
                            className={clsx("w-2 h-2 rounded-full shrink-0", category.getColorClass("bg"))}
                            aria-hidden="true"
                        />
                    )}

                    <span className="truncate">{project.name}</span>

                    {waiting !== null && (
                        <span
                            className="ml-auto shrink-0 rounded-full bg-wp-track px-2 py-0.5 text-[11px] font-bold leading-4 text-wp-fg-secondary tabular-nums"
                            title={t("projects.waiting", { count: waiting })}
                        >
                            {waiting}
                        </span>
                    )}
                </button>

                <IconButton
                    icon="edit"
                    size="xs"
                    tooltip={t("projects.edit")}
                    onClick={onEdit}
                />
            </div>

            {isExpanded && (
                <div
                    ref={setNodeRef}
                    className={clsx(
                        "pl-2 pt-1 pb-2 rounded-lg",
                        isOver && "bg-wp-accent-soft ring-1 ring-wp-accent",
                    )}
                >
                    {tasks.length === 0 && (
                        <p className="px-1 py-1 text-xs text-wp-muted">
                            {t("projects.no_tasks")}
                        </p>
                    )}

                    <ul className="flex flex-col gap-2">
                        <SortableContext items={tasks.map((task) => `task-${task.id}`)}>
                            {tasks.map((task) => (
                                <DraggableTask key={task.id} task={task} projectId={project.id} />
                            ))}
                        </SortableContext>
                        {/* Adding straight to the backlog: the drawer had no way to make a task
                            at all, so a project could only be filled by dragging one out of the
                            week. */}
                        <NewTask projectId={project.id} />
                    </ul>
                </div>
            )}
        </div>
    );
};

/**
 * The projects drawer: custom lists and their backlogs, beside the week.
 *
 * A backlog is the tasks in a project that have no week yet. They sit inside the board's existing
 * `DndContext`, so one can be dragged straight out of a list and onto a day — and, since the
 * expanded list is a droppable of its own, dragged back off the week into a project.
 *
 * Backlogs load when a project is expanded, not with the drawer: the week payload deliberately
 * leaves them out so a long backlog is not refetched with every week, and the same reasoning
 * applies to opening the drawer. The lists themselves live in `DataContext` — the board has to
 * see those tasks for a drag out of here to reach `findTask` at all.
 */
const ProjectDrawer: React.FC = () => {
    const { t } = useTranslation();
    const { projects, loadBacklog, focusedCategory } = useData();
    // Held outside the drawer so `p` and the chevron drive the same thing.
    const { projectsOpen: open, setProjectsOpen: setOpen } = useShortcuts();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [editing, setEditing] = useState<Project | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (expanded !== null) {
            loadBacklog(expanded);
        }
    }, [expanded, loadBacklog]);

    const edit = (project: Project | null) => {
        setEditing(project);
        setModalOpen(true);
    };

    // A project whose category is not the focused one has nothing to show while focus is on.
    // One with no category of its own stays: its tasks carry their own.
    const visibleProjects = projects.filter(
        (project) => projectMatchesFocus(project.categoryId, focusedCategory),
    );

    if (!open) {
        return (
            /* Shut, the drawer was a chevron against an edge and nothing else — no way to know
               what opening it would give you. The rail says so, sideways, in the width a closed
               drawer can spare. */
            <button
                type="button"
                className="flex-none w-10 flex flex-col items-center gap-3.5 py-4 bg-wp-chrome border-l border-wp-border cursor-pointer text-wp-fg-secondary hover:text-wp-fg hover:bg-wp-card-hover"
                onClick={() => setOpen(true)}
                aria-label={t("projects.show")}
                title={t("projects.show")}
            >
                <PanelRightOpen size={16} className="shrink-0" />
                <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-bold uppercase tracking-[1.5px]">
                    {t("projects.title")}
                </span>
            </button>
        );
    }

    return (
        <aside className="flex-none w-72 flex flex-col bg-wp-chrome border-l border-wp-border overflow-y-auto">
            <div className="flex items-center justify-between gap-1 pl-4 pr-2 h-[52px] border-b border-wp-border">
                <h2 className="flex-1 min-w-0 truncate text-[11px] font-bold tracking-[1.5px] uppercase text-wp-fg-secondary">
                    {t("projects.title")}
                </h2>
                {/* Creating a project is a dialog now. The form that used to sit along the
                    bottom of the drawer put a text field and a button side by side in a 288px
                    column, and the button hung off the right-hand edge at every width. */}
                <IconButton
                    icon="plus"
                    size="sm"
                    tooltip={t("projects.add")}
                    onClick={() => edit(null)}
                />
                <IconButton
                    icon="panelClose"
                    size="sm"
                    tooltip={t("projects.hide")}
                    onClick={() => setOpen(false)}
                />
            </div>

            <div className="flex-1 flex flex-col gap-1 p-3">
                {visibleProjects.length === 0 && (
                    <p className="px-1 py-2 text-xs text-wp-muted">
                        {t("projects.empty")}
                    </p>
                )}

                {visibleProjects.map((project) => (
                    <ProjectRow
                        key={project.id}
                        project={project}
                        isExpanded={expanded === project.id}
                        onToggle={() => setExpanded(expanded === project.id ? null : project.id)}
                        onEdit={() => edit(project)}
                    />
                ))}
            </div>

            <ProjectModal project={editing} isOpen={modalOpen} onOpenChange={setModalOpen} />
        </aside>
    );
};

export default ProjectDrawer;
