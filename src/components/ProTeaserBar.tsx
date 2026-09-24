import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProTeaser } from "../contexts/proTeaser";

/**
 * The one Pro teaser, on the board after the Leftover Review has closed.
 *
 * A fact with a door: "Your deferrals have a pattern. Want to see it?" Curiosity, not
 * deficiency — no price, no plan name, nothing about what the account lacks. Its own row under
 * the top bar, like `UpdateBar`, so it never sits on top of the board. Leaving it alone is an
 * answer too: the next review counts it as ignored.
 */
const ProTeaserBar: React.FC = () => {
    const { t } = useTranslation();
    const { signature, href, follow, dismiss } = useProTeaser();

    if (!signature || !href) {
        return null;
    }

    return (
        <div
            className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-sm"
            role="status"
            data-pro-teaser
        >
            <p className="min-w-0 text-slate-700 dark:text-slate-200">
                {t("teaser.message")}{" "}
                <a
                    href={href}
                    target="_blank"
                    rel="noopener"
                    className="font-medium underline underline-offset-2 text-sky-700 dark:text-sky-300"
                    onClick={follow}
                >
                    {t("teaser.cta")}
                </a>
            </p>

            <button
                type="button"
                className="shrink-0 p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t("teaser.dismiss")}
                onClick={dismiss}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default ProTeaserBar;
