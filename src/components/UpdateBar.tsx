import React from "react";
import { Button } from "@heroui/react";
import { RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppUpdate } from "../utils/appUpdate";

/**
 * "There is a newer version than the one you are looking at."
 *
 * A slim bar directly under the top bar, in both layouts. Not a floating panel: the vertical
 * board already owns the bottom of the screen with its day pills, and anything overlapping those
 * would cover the control people use most to cover the one they use once.
 *
 * It takes up space rather than floating over the board, so nothing is hidden behind it.
 */
const UpdateBar: React.FC = () => {
  const { t } = useTranslation();
  const { updateReady, refresh, dismiss } = useAppUpdate();

  if (!updateReady) {
    return null;
  }

  return (
    <div className="flex-none flex items-center gap-2 px-3 py-2 bg-wp-accent-soft text-wp-fg border-b border-wp-border">
      <RefreshCw size={16} className="shrink-0" />

      <p className="flex-1 min-w-0 text-sm">{t("update.available")}</p>

      <Button size="sm" variant="primary" onPress={refresh}>
        {t("update.refresh")}
      </Button>

      <button
        type="button"
        onClick={dismiss}
        aria-label={t("update.dismiss")}
        className="p-1 rounded-md text-wp-fg-secondary hover:text-wp-fg hover:bg-wp-track cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default UpdateBar;
