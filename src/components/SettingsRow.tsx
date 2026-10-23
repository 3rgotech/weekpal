import React from "react";
import clsx from "clsx";

/**
 * One setting: its name (and, where it needs one, a line saying what it does) in a fixed column,
 * the control beside it, and a hairline under the pair — the redesign's form, which reads as a
 * list of settings rather than as the grid of floating labels it replaced.
 *
 * Stacked on a phone, where a 200px label column would leave the control no room at all.
 */
export const Row: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }> = ({
    label,
    hint,
    children,
}) => (
    <div className="flex flex-col gap-2 py-3.5 border-b border-wp-border last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex flex-col gap-[3px] sm:w-[200px] sm:shrink-0">
            <h3 className="text-[13px] font-semibold text-wp-fg">{label}</h3>
            {hint && <p className="text-xs leading-[1.4] text-wp-muted">{hint}</p>}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
    </div>
);

interface SegmentOption<T> {
    value: T;
    label: React.ReactNode;
    icon?: React.ReactNode;
}

/**
 * Two or three mutually exclusive choices, all on screen at once: the redesign's segmented
 * control, a raised pill on a sunken track. Replaces the button groups whose "selected" was a
 * solid blue fill — which, next to the dialog's one primary button, read as a second one.
 */
export function Segmented<T>({ options, value, onChange, isDisabled = false }: {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Shown but not usable — a Pro setting without the plan, or one this browser cannot honour. */
    isDisabled?: boolean;
}) {
    return (
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-[9px] bg-wp-track p-[3px]">
            {options.map((option) => {
                const on = option.value === value;

                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        aria-pressed={on}
                        disabled={isDisabled}
                        onClick={() => onChange(option.value)}
                        className={clsx(
                            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors cursor-pointer",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "focus-visible:outline-2 focus-visible:outline-wp-accent [&_svg]:size-3.5",
                            on
                                ? "bg-wp-seg-active text-wp-fg shadow-wp-seg [&_svg]:text-wp-accent"
                                : "text-wp-fg-secondary hover:text-wp-fg [&_svg]:text-wp-muted",
                        )}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
