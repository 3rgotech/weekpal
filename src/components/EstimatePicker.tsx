import React from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { ESTIMATE_CHIPS, MAX_ESTIMATE, MIN_ESTIMATE, chipLabel } from "../utils/estimate";

interface EstimatePickerProps {
    value: number | null;
    onChange: (minutes: number | null) => void;
    /** Numbers the chips answer to, for the batch mode. Off in the editor, where 1–6 would fight typing. */
    numbered?: boolean;
}

/**
 * Six chips and a free field.
 *
 * *(rt §5)* **Never asked at capture** — quick-add stays type-enter-gone, and this lives in the
 * editor and in batch estimation, both of which someone has chosen to open. An estimate demanded
 * at the moment of writing a task down is a tax on the one gesture that has to stay frictionless.
 *
 * Six fixed values rather than a settings screen. The person who needs the 5-minute chip and the
 * person who needs half a day are the same person on different days, so making it configurable
 * would ask everyone to predict which of themselves they are.
 *
 * The chosen chip toggles off: pressing the one already selected clears the estimate, because
 * "actually I don't know" has to be reachable without a separate control saying so.
 */
const EstimatePicker: React.FC<EstimatePickerProps> = ({ value, onChange, numbered = false }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">{t("estimate.label")}</span>

            <div className="flex flex-wrap gap-1.5">
                {ESTIMATE_CHIPS.map((minutes, index) => {
                    const selected = value === minutes;

                    return (
                        <button
                            key={minutes}
                            type="button"
                            aria-pressed={selected}
                            // The duration alone. In batch mode a leading "1" sits against "5m"
                            // and the two read as "15m" — which is also the name of a real chip
                            // two places along, so the number is decoration and says so.
                            aria-label={chipLabel(minutes)}
                            // Pressing the selected chip clears it — "actually I don't know" needs
                            // to be reachable without a control of its own.
                            onClick={() => onChange(selected ? null : minutes)}
                            className={clsx(
                                "px-2.5 py-1 rounded-full text-xs font-medium tabular-nums transition-colors",
                                "focus-visible:outline-2 focus-visible:outline-sky-500",
                                selected
                                    ? "bg-sky-950 text-white dark:bg-white dark:text-sky-950"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-sky-900 dark:text-slate-200 dark:hover:bg-sky-800",
                            )}
                        >
                            {numbered && (
                                <span aria-hidden="true" className="opacity-50 mr-1.5">{index + 1}</span>
                            )}
                            <span aria-hidden="true">{chipLabel(minutes)}</span>
                        </button>
                    );
                })}
            </div>

            {/* The escape hatch from the six. Empty means no estimate — which is a real answer,
                not a missing one, so it is never filled in on the user's behalf. */}
            <input
                type="number"
                min={MIN_ESTIMATE}
                max={MAX_ESTIMATE}
                value={value ?? ""}
                aria-label={t("estimate.custom")}
                placeholder={t("estimate.custom")}
                onChange={(event) => {
                    const parsed = parseInt(event.target.value, 10);

                    onChange(Number.isInteger(parsed) && parsed >= MIN_ESTIMATE
                        ? Math.min(parsed, MAX_ESTIMATE)
                        : null);
                }}
                className="w-32 px-2 py-1 text-sm rounded-md border border-slate-300 dark:border-sky-900 bg-white dark:bg-sky-950"
            />
        </div>
    );
};

export default EstimatePicker;
