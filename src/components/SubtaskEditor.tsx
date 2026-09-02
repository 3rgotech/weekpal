import React, { useState } from "react";
import { Checkbox, Input, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { Subtask } from "../types";
import IconButton from "./IconButton";

interface SubtaskEditorProps {
    subtasks: Subtask[];
    onChange: (subtasks: Subtask[]) => void;
}

/**
 * The checklist on a task.
 *
 * Subtasks are a JSON array on the task rather than rows of their own, so they have no ids and
 * are addressed by position — which is why every change here rebuilds the whole array and hands
 * it back, instead of patching one item. It also means the list is saved with the task, by the
 * modal's Save button, rather than writing on each keystroke.
 */
const SubtaskEditor: React.FC<SubtaskEditorProps> = ({ subtasks, onChange }) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState("");

    const add = () => {
        const title = draft.trim();
        if (title === "") {
            return;
        }

        setDraft("");
        onChange([...subtasks, { title, completed: false }]);
    };

    const replace = (index: number, subtask: Subtask) => {
        onChange(subtasks.map((existing, i) => (i === index ? subtask : existing)));
    };

    const remove = (index: number) => {
        onChange(subtasks.filter((_, i) => i !== index));
    };

    const { done, total } = {
        done: subtasks.filter((subtask) => subtask.completed).length,
        total: subtasks.length,
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-medium dark:text-white">{t("task.subtasks.title")}</h4>
                {total > 0 && (
                    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {t("task.subtasks.progress", { done, total })}
                    </span>
                )}
            </div>

            {subtasks.map((subtask, index) => (
                // Positional keys, because a subtask has no id to key on. Safe here: the list is
                // only ever appended to or filtered, never reordered.
                <div key={index} className="flex items-center gap-2">
                    <Checkbox
                        isSelected={subtask.completed}
                        onChange={(completed) => replace(index, { ...subtask, completed })}
                        aria-label={subtask.title}
                    >
                        <Checkbox.Control>
                            <Checkbox.Indicator />
                        </Checkbox.Control>
                    </Checkbox>
                    {/* The strike-through used to be a `classNames={{ input: … }}` slot override.
                        v3 has no slots — the input is a component, so the class goes on it. */}
                    <TextField
                        className="flex-1"
                        aria-label={t("task.subtasks.item")}
                        value={subtask.title}
                        onChange={(title) => replace(index, { ...subtask, title })}
                    >
                        <Input className={subtask.completed ? "line-through text-slate-400" : ""} />
                    </TextField>
                    <IconButton
                        icon="trash"
                        size="xs"
                        tooltip={t("task.subtasks.remove")}
                        onClick={() => remove(index)}
                    />
                </div>
            ))}

            <div className="flex items-center gap-2">
                <TextField
                    className="flex-1"
                    // Distinct from the button beside it: the field is where a new subtask is
                    // written, the button is what adds it, and giving both the same name leaves
                    // a screen reader announcing two identical controls.
                    aria-label={t("task.subtasks.new")}
                    value={draft}
                    onChange={setDraft}
                    // Enter adds and leaves the field focused, so a checklist can be typed
                    // straight through without reaching for the mouse.
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            add();
                        }
                    }}
                >
                    <Input placeholder={t("task.subtasks.placeholder")} />
                </TextField>
                <IconButton
                    icon="plus"
                    size="xs"
                    tooltip={t("task.subtasks.add")}
                    onClick={add}
                />
            </div>
        </div>
    );
};

export default SubtaskEditor;
