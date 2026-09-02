import React, { useCallback, useEffect, useState } from "react";
import { Button, Spinner, Tabs, TextArea, TextField } from "@heroui/react";
import { useTranslation } from "react-i18next";
import Task from "../data/task";
import Note from "../data/note";
import HistoryEntry from "../data/history";
import { useData } from "../contexts/DataContext";
import useDayJs from "../utils/dayjs";
import IconButton from "./IconButton";

/**
 * The notes thread and the changelog for one task.
 *
 * The two halves behave differently on purpose. Notes are the user's own writing, so they are
 * local-first and queue like any other write — one can be typed offline. History is derived by
 * the server from the writes it has received, so there is nothing to write and nothing worth
 * caching; it simply says so when there is no connection.
 */
const TaskActivity: React.FC<{ task: Task }> = ({ task }) => {
    const { t } = useTranslation();
    const dayjs = useDayJs();
    const { noteStore, historyAdapter } = useData();

    const [notes, setNotes] = useState<Note[]>([]);
    const [history, setHistory] = useState<HistoryEntry[] | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyFailed, setHistoryFailed] = useState(false);

    const [draft, setDraft] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingBody, setEditingBody] = useState("");

    const refreshNotes = useCallback(async () => {
        if (!noteStore) {
            return;
        }
        setNotes(await noteStore.list(task.id));
    }, [noteStore, task.id]);

    useEffect(() => {
        refreshNotes();
    }, [refreshNotes]);

    /** Fetched when the tab is opened rather than with the modal: most task edits never look. */
    const loadHistory = useCallback(async () => {
        if (!historyAdapter || history !== null || loadingHistory) {
            return;
        }

        setLoadingHistory(true);
        setHistoryFailed(false);
        try {
            setHistory(await historyAdapter.list(task.id));
        } catch (error) {
            console.error(`Could not load history for task ${task.id}:`, error);
            setHistoryFailed(true);
        } finally {
            setLoadingHistory(false);
        }
    }, [historyAdapter, history, loadingHistory, task.id]);

    const addNote = async () => {
        const body = draft.trim();
        if (!body || !noteStore) {
            return;
        }

        setDraft("");
        await noteStore.create(new Note({ taskId: task.id, body }));
        await refreshNotes();
    };

    const saveEdit = async (note: Note) => {
        const body = editingBody.trim();
        if (!body || !noteStore) {
            return;
        }

        note.body = body;
        setEditingId(null);
        await noteStore.update(note);
        await refreshNotes();
    };

    const removeNote = async (note: Note) => {
        if (!noteStore) {
            return;
        }

        await noteStore.delete(note);
        await refreshNotes();
    };

    const notesTab = (
        <div className="flex flex-col gap-3">
            {notes.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("task.notes.empty")}</p>
            )}

            {notes.map((note) => (
                <div
                    key={note.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-600 p-3"
                >
                    {editingId === note.id ? (
                        <div className="flex flex-col gap-2">
                            <TextField
                                aria-label={t("task.notes.edit")}
                                value={editingBody}
                                onChange={setEditingBody}
                            >
                                <TextArea rows={2} />
                            </TextField>
                            <div className="flex flex-row gap-2 justify-end">
                                <Button size="sm" variant="tertiary" onPress={() => setEditingId(null)}>
                                    {t("actions.cancel")}
                                </Button>
                                <Button size="sm" variant="primary" onPress={() => saveEdit(note)}>
                                    {t("actions.save")}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-row justify-between items-start gap-2">
                                {/* Notes are plain text, rendered as text — `whitespace-pre-wrap`
                                    keeps the line breaks someone typed without interpreting
                                    anything in the body as markup. */}
                                <p className="text-sm whitespace-pre-wrap break-words dark:text-white">
                                    {note.body}
                                </p>
                                <div className="flex flex-row gap-1 shrink-0">
                                    <IconButton
                                        icon="edit"
                                        size="xs"
                                        tooltip={t("task.notes.edit")}
                                        onClick={() => {
                                            setEditingId(note.id);
                                            setEditingBody(note.body);
                                        }}
                                    />
                                    <IconButton
                                        icon="trash"
                                        size="xs"
                                        tooltip={t("task.notes.delete")}
                                        onClick={() => {
                                            removeNote(note);
                                        }}
                                    />
                                </div>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                {note.createdAt ? dayjs(note.createdAt).fromNow() : ""}
                                {note.updatedAt ? ` · ${t("task.notes.edited")}` : ""}
                            </p>
                        </>
                    )}
                </div>
            ))}

            <div className="flex flex-col gap-2">
                <TextField
                    aria-label={t("task.notes.add")}
                    value={draft}
                    onChange={setDraft}
                >
                    <TextArea rows={2} placeholder={t("task.notes.placeholder")} />
                </TextField>
                <div className="flex justify-end">
                    <Button size="sm" variant="primary" isDisabled={draft.trim() === ""} onPress={addNote}>
                        {t("task.notes.add")}
                    </Button>
                </div>
            </div>
        </div>
    );

    const describe = (value: unknown): string => {
        if (value === null || value === undefined || value === "") {
            return t("task.history.nothing");
        }
        if (typeof value === "object") {
            return JSON.stringify(value);
        }
        return String(value);
    };

    const historyTab = (
        <div className="flex flex-col gap-3">
            {loadingHistory && <Spinner size="sm" />}

            {!loadingHistory && historyFailed && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("task.history.unavailable")}
                </p>
            )}

            {!loadingHistory && !historyFailed && history?.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("task.history.empty")}</p>
            )}

            {!loadingHistory &&
                (history ?? []).map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-1">
                        <div className="flex flex-row justify-between items-baseline gap-2">
                            <span className="text-sm font-medium dark:text-white">
                                {t(`task.history.event.${entry.event}`)}
                            </span>
                            <span className="text-xs text-slate-400 shrink-0">
                                {entry.createdAt ? dayjs(entry.createdAt).fromNow() : ""}
                            </span>
                        </div>

                        {entry.changedFields().length > 0 && (
                            <ul className="text-xs text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                                {entry.changedFields().map((field) => (
                                    <li key={field}>
                                        <span className="font-medium">
                                            {t(`task.history.field.${field}`, { defaultValue: field })}
                                        </span>
                                        {": "}
                                        {describe(entry.changes?.[field]?.from)}
                                        {" → "}
                                        {describe(entry.changes?.[field]?.to)}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
        </div>
    );

    return (
        <Tabs
            aria-label={t("task.activity")}
            variant="secondary"
            onSelectionChange={(key) => {
                if (key === "history") {
                    loadHistory();
                }
            }}
        >
            {/* The tab strip and the panels are separate in v3: a `Tabs.Tab` carries only the
                label, and its content lives in the `Tabs.Panel` sharing its id. */}
            <Tabs.List aria-label={t("task.activity")}>
                <Tabs.Tab id="notes">{t("task.notes.title")}</Tabs.Tab>
                <Tabs.Tab id="history">{t("task.history.title")}</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel id="notes">{notesTab}</Tabs.Panel>
            <Tabs.Panel id="history">{historyTab}</Tabs.Panel>
        </Tabs>
    );
};

export default TaskActivity;
