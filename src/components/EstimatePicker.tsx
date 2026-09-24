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
        <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-wp-fg-secondary">{t("estimate.label")}</span>

            {/* One row of pills, the free field last and shaped like them: it is the seventh
                answer to the same question, not a separate control. */}
            <div className="flex items-center gap-1.5">
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
                                "flex-1 min-w-0 px-1 py-[7px] rounded-full border text-xs font-semibold tabular-nums transition-colors cursor-pointer",
                                "focus-visible:outline-2 focus-visible:outline-wp-accent",
                                selected
                                    ? "bg-wp-accent border-wp-accent text-wp-on-accent"
                                    : "border-wp-border-strong text-wp-fg-secondary hover:bg-wp-track hover:text-wp-fg",
                            )}
                        >
                            {numbered && (
                                <span aria-hidden="true" className="opacity-50 mr-1.5">{index + 1}</span>
                            )}
                            <span aria-hidden="true">{chipLabel(minutes)}</span>
                        </button>
                    );
                })}

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
                className="w-16 sm:w-24 px-2 sm:px-3 py-[7px] rounded-full border border-wp-border-strong bg-transparent text-xs font-medium text-wp-fg placeholder:text-wp-muted outline-hidden focus:border-wp-accent"
            />
            </div>
        </div>
    );
};

export default EstimatePicker;
