import React, { useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useData } from "../contexts/DataContext";
import AdapterFactory from "../adapter";
import { ImportRefused } from "../adapter/api/APIImportAdapter";
import { ImportSummary } from "../types";
import { classifyFailure } from "../utils/SyncService";
import { reportSyncFailure } from "../utils/syncStatus";

/** What the file input accepts, and what the server is willing to read. */
const ACCEPT = ".csv,.xlsx,.ods";

/**
 * Bringing tasks in from wherever they were kept before.
 *
 * The strategy document calls a missing importer the biggest single reason someone does not
 * switch, and it is the one gap that never gets reported: a person with two hundred tasks
 * elsewhere does not file feedback, they close the tab.
 *
 * No column-mapping step. The server matches the headers other task apps actually export, so the
 * first thing a new user does is not fill in a form about their own spreadsheet. When it cannot
 * find a column of titles it says so rather than guessing, because taking the first column would
 * import a sheet of dates as a week of nonsense.
 */
const ImportPanel: React.FC = () => {
    // `n`, never `count`: i18next reads a `count` option as a plural selector and goes looking
    // for `_one`/`_other` keys that do not exist here.
    const { t } = useTranslation();
    const { reloadBoard } = useData();
    const input = useRef<HTMLInputElement>(null);

    const [busy, setBusy] = useState(false);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [unmatched, setUnmatched] = useState<string[]>([]);

    // What a dry run said the file would do, and the file itself, held until it is confirmed.
    // Nothing is written until then: a sheet of a thousand undated tasks puts every one of them
    // in Some day, and being told that afterwards is being told too late.
    const [pending, setPending] = useState<{ file: File; preview: ImportSummary } | null>(null);

    const adapter = useMemo(() => AdapterFactory.createAdapters().importAdapter, []);

    const choose = async (file: File | undefined) => {
        if (!file || !adapter) {
            return;
        }

        setBusy(true);
        setSummary(null);
        setError(null);
        setUnmatched([]);
        setPending(null);

        try {
            setPending({ file, preview: await adapter.preview(file) });
        } catch (failure) {
            // A refusal is the server's answer, not a broken connection — reporting it as a sync
            // failure would put the board into an offline state over a bad spreadsheet.
            if (failure instanceof ImportRefused) {
                setError(t("import.failed"));
                setUnmatched(failure.unmatched);
            } else {
                reportSyncFailure(classifyFailure(failure));
                setError(t("import.failed"));
            }
        } finally {
            setBusy(false);

            // Cleared so the same file can be chosen twice — after fixing a header, say. Without
            // it the input holds the old selection and picking it again fires no change event.
            if (input.current) {
                input.current.value = "";
            }
        }
    };

    const confirm = async () => {
        if (!adapter || !pending) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            const result = await adapter.upload(pending.file);

            setSummary(result);
            setPending(null);
            // The import wrote straight to the server, so the board has to be told to look again
            // — otherwise nothing appears until the next scheduled pull and it reads as a failure.
            await reloadBoard();
        } catch (failure) {
            reportSyncFailure(classifyFailure(failure));
            setError(t("import.failed"));
        } finally {
            setBusy(false);
        }
    };

    if (!adapter) {
        return (
            <p className="col-span-3 text-sm text-slate-500 dark:text-slate-400">
                {t("import.unavailable")}
            </p>
        );
    }

    return (
        <>
            <h3 className="text-base dark:text-white">{t("import.title")}</h3>

            <div className="col-span-2 flex flex-col gap-2">
                <input
                    ref={input}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    aria-label={t("import.choose")}
                    onChange={(event) => { void choose(event.target.files?.[0]); }}
                />

                <div>
                    <Button
                        variant="secondary"
                        isDisabled={busy}
                        onPress={() => input.current?.click()}
                    >
                        <Upload size={16} />
                        {busy ? t("import.working") : t("import.choose")}
                    </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("import.formats")}
                </p>

                {error !== null && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                        <p>{error}</p>

                        {/* The headings the server did not recognise. Shown because they are the
                            answer: they are what someone quotes in a support message, and what
                            goes into the alias table to make the next file of that shape work. */}
                        {unmatched.length > 0 && (
                            <p className="mt-1 text-xs">
                                {t("import.unmatched", { headers: unmatched.join(", ") })}
                            </p>
                        )}
                    </div>
                )}

                {pending !== null && (
                    <div className="flex flex-col gap-2 rounded-md border border-slate-200 dark:border-slate-600 p-3">
                        <p className="text-sm dark:text-white">
                            {t("import.will_import", { n: pending.preview.imported })}
                        </p>

                        <ul className="text-xs text-slate-500 dark:text-slate-400">
                            {/* The line this whole step exists for. Everything undated lands in
                                one column, and a big number here is worth seeing beforehand. */}
                            {pending.preview.undated > 0 && (
                                <li>{t("import.will_be_undated", { n: pending.preview.undated })}</li>
                            )}
                            {pending.preview.categories_created > 0 && (
                                <li>{t("import.will_create", { n: pending.preview.categories_created })}</li>
                            )}
                            {pending.preview.skipped > 0 && (
                                <li>{t("import.skipped", { n: pending.preview.skipped })}</li>
                            )}
                            {pending.preview.unmatched.length > 0 && (
                                <li>{t("import.ignored", { headers: pending.preview.unmatched.join(", ") })}</li>
                            )}
                        </ul>

                        <div className="flex items-center gap-2">
                            <Button variant="primary" isDisabled={busy} onPress={() => { void confirm(); }}>
                                {busy ? t("import.working") : t("import.confirm")}
                            </Button>
                            <Button variant="secondary" isDisabled={busy} onPress={() => setPending(null)}>
                                {t("actions.cancel")}
                            </Button>
                        </div>
                    </div>
                )}

                {summary !== null && (
                    <div className="text-sm dark:text-white">
                        <p>{t("import.done", { n: summary.imported })}</p>

                        <ul className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {summary.unmatched.length > 0 && (
                                <li>{t("import.ignored", { headers: summary.unmatched.join(", ") })}</li>
                            )}
                            {summary.undated > 0 && (
                                <li>{t("import.undated", { n: summary.undated })}</li>
                            )}
                            {summary.categories_created > 0 && (
                                <li>{t("import.categories", { n: summary.categories_created })}</li>
                            )}
                            {summary.skipped > 0 && (
                                <li>{t("import.skipped", { n: summary.skipped })}</li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
};

export default ImportPanel;
