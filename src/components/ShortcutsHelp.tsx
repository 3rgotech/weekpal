import React from "react";
import { Button, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { SHORTCUTS } from "../utils/shortcuts";

interface ShortcutsHelpProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * What the keys do, on `?`.
 *
 * Shortcuts nobody can find are shortcuts nobody has, and the board has no menu bar to hang them
 * off — so the list is one keystroke away, and that keystroke is in the list.
 */
const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onOpenChange }) => {
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("shortcuts.title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("shortcuts.intro")}
                            </p>

                            <ul className="flex flex-col gap-1 pt-2">
                                {SHORTCUTS.map((shortcut) => (
                                    <li key={shortcut.description} className="flex items-center gap-3 text-sm">
                                        <span className="flex gap-1 w-20 shrink-0">
                                            {shortcut.keys.map((key) => (
                                                <kbd
                                                    key={key}
                                                    className="px-1.5 py-0.5 rounded-sm border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-xs font-mono"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </span>
                                        <span>{t(shortcut.description)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant="primary" onPress={() => onOpenChange(false)}>
                                {t("actions.close")}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default ShortcutsHelp;
