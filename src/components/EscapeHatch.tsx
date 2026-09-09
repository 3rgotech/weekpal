import React from "react";
import EscapeHatchModal from "./EscapeHatchModal";
import { useData } from "../contexts/DataContext";

/**
 * Mounts R20's three doors once, beside the board.
 *
 * The state lives on `DataContext` for the same reason `overLimitColumn` does: a dialog rendered
 * per card would be forty dialogs that are almost never open, and the card that opens it is
 * often the one about to be deleted.
 */
const EscapeHatch: React.FC = () => {
    const { escapeTask, clearEscape } = useData();

    return <EscapeHatchModal task={escapeTask} onClose={clearEscape} />;
};

export default EscapeHatch;
