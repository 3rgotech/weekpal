import React, { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Share } from "lucide-react";
import { useTranslation } from "react-i18next";
import { isIosSafari } from "../utils/install";

interface InstallModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

/** Where a screenshot of the share sheet goes, if one is added. Absent is fine — see below. */
const ILLUSTRATION = "/install-add-to-home-screen.png";

/**
 * How to keep the board on a home screen, on a platform that will not do it for you.
 *
 * iOS has no install prompt to fire: adding to the home screen is three taps in Safari's share
 * sheet, and the only thing an app can do is say so. That instruction used to be a description
 * squeezed beside a menu item, where it wrapped the item's own label onto two lines and still
 * read as a wall of text.
 *
 * The button hands the visitor as far along as the web is allowed to: `navigator.share` opens the
 * very sheet that holds "Add to Home Screen", so the remaining step is one tap in a sheet that is
 * already open rather than a control they have to go and find.
 */
const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onOpenChange }) => {
    const { t } = useTranslation();
    const [illustrationFailed, setIllustrationFailed] = useState(false);

    const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

    const share = async () => {
        if (!canShare) {
            return;
        }

        try {
            await navigator.share({
                title: document.title,
                url: window.location.href,
            });
        } catch {
            // Dismissing the sheet rejects, and so does a platform that refuses the call. Neither
            // is a failure worth reporting: the steps are still on screen behind it.
        }
    };

    const steps: string[] = isIosSafari()
        ? ["install.step_share", "install.step_add", "install.step_confirm"]
        : ["install.step_menu", "install.step_add", "install.step_confirm"];

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal.Backdrop>
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{t("install.title")}</Modal.Heading>
                        </Modal.Header>

                        <Modal.Body className="flex flex-col gap-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("install.intro")}
                            </p>

                            <ol className="flex flex-col gap-2 text-sm list-decimal list-inside">
                                {steps.map((step) => (
                                    <li key={step}>{t(step)}</li>
                                ))}
                            </ol>

                            {/* Drop a screenshot at `public/install-add-to-home-screen.png` and it
                                appears here; until one exists the modal simply has no picture,
                                rather than a broken image icon. */}
                            {!illustrationFailed && (
                                <img
                                    src={ILLUSTRATION}
                                    alt=""
                                    className="rounded-md border border-slate-200 dark:border-slate-600"
                                    onError={() => setIllustrationFailed(true)}
                                />
                            )}
                        </Modal.Body>

                        <Modal.Footer className="flex items-center justify-end gap-2">
                            <Button variant="secondary" onPress={() => onOpenChange(false)}>
                                {t("actions.close")}
                            </Button>
                            {canShare && (
                                <Button variant="primary" onPress={() => { void share(); }}>
                                    <Share size={16} />
                                    {t("install.open_share")}
                                </Button>
                            )}
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
};

export default InstallModal;
