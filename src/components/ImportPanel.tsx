import React, { useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useData } from "../contexts/DataContext";
import AdapterFactory from "../adapter";
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

    const adapter = useMemo(() => AdapterFactory.createAdapters().importAdapter, []);

    const choose = async (file: File | undefined) => {
        if (!file || !adapter) {
            return;
        }

        setBusy(true);
        setSummary(null);
        setError(null);

        try {
            const result = await adapter.upload(file);

            setSummary(result);
            // The import wrote straight to the server, so the board has to be told to look again
            // — otherwise nothing appears until the next scheduled pull and it reads as a failure.
            await reloadBoard();
        } catch (failure) {
            reportSyncFailure(classifyFailure(failure));
            setError(t("import.failed"));
        } finally {
            setBusy(false);

            // Cleared so the same file can be chosen twice — after fixing a header, say. Without
            // it the input holds the old selection and picking it again fires no change event.
            if (input.current) {
                input.current.value = "";
            }
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
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                {summary !== null && (
                    <div className="text-sm dark:text-white">
                        <p>{t("import.done", { n: summary.imported })}</p>

                        <ul className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
