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
            className="flex items-center justify-between gap-2 px-3 py-1.5 bg-wp-chrome border-b border-wp-border text-[13px] text-wp-fg-secondary"
            role="status"
            data-pro-teaser
        >
            <p className="min-w-0 text-wp-fg-secondary">
                {t("teaser.message")}{" "}
                <a
                    href={href}
                    target="_blank"
                    rel="noopener"
                    className="font-medium underline underline-offset-2 text-wp-accent"
                    onClick={follow}
                >
                    {t("teaser.cta")}
                </a>
            </p>

            <button
                type="button"
                className="shrink-0 p-1 rounded-md text-wp-muted hover:text-wp-fg hover:bg-wp-track cursor-pointer"
                aria-label={t("teaser.dismiss")}
                onClick={dismiss}
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default ProTeaserBar;
