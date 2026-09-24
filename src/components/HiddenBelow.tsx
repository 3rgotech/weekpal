import React from "react";
import { useTranslation } from "react-i18next";

interface HiddenBelowProps {
    count: number;
    onReveal: () => void;
}

/**
 * "3 more" on the clipped edge of a column that scrolls.
 *
 * *(rt §4)* The signal a scrolling column does not otherwise give: **how much total and how much
 * unseen are two different questions**, and a full Tuesday with its fourth task out of sight
 * looks exactly like a Tuesday with three.
 *
 * On the edge itself rather than in the header, because that is where the information is — the
 * fold is the thing being described. It sits over the last row's bottom edge with a fade behind
 * it, which is the one place a wash is honest: it is describing the clip, not colouring content.
 *
 * Tappable, because naming a problem the user then has to solve by hunting for the scrollbar is
 * worse than saying nothing.
 */
const HiddenBelow: React.FC<HiddenBelowProps> = ({ count, onReveal }) => {
    const { t } = useTranslation();

    if (count <= 0) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onReveal}
            className="
                absolute bottom-0 inset-x-0 z-10 flex justify-center pb-1 pt-4
                text-[11px] font-semibold text-wp-fg-secondary cursor-pointer
                bg-gradient-to-t from-wp-surface to-transparent
                focus-visible:outline-2 focus-visible:outline-wp-accent
            "
        >
            <span className="px-2 py-0.5 rounded-full bg-wp-track">
                {t("main.hidden_below", { count })}
            </span>
        </button>
    );
};

export default HiddenBelow;
