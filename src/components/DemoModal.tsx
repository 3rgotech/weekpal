import React from "react";
import { Button, Modal } from "@heroui/react";
import { FlaskConical, HardDrive, Info, RotateCcw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getEnvConfig } from "../utils/env";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** What the demo is, in three facts: where the data lives, how long it lasts, and what is in it. */
const POINTS = [
  { icon: HardDrive, key: "demo.point_local" },
  { icon: RotateCcw, key: "demo.point_temporary" },
  { icon: Sparkles, key: "demo.point_sample" },
] as const;

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const { t } = useTranslation();
  const { signupUrl } = getEnvConfig();

  return (
    /* No `Modal.CloseTrigger` below: that is how v3 spells the old `hideCloseButton`. */
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop variant="blur" isDismissable={false}>
        <Modal.Container size="md">
          <Modal.Dialog className="sm:max-w-[520px] rounded-2xl p-0">
            <Modal.Body className="m-0 flex flex-col gap-5 px-7 pt-7 pb-1">
              <div className="flex items-center gap-3.5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-wp-warn-soft text-wp-warn">
                  <FlaskConical size={22} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <Modal.Heading className="text-xl tracking-[-0.3px]">{t("demo.title")}</Modal.Heading>
                  <p className="text-sm font-medium leading-normal text-wp-fg-secondary">{t("demo.subtitle")}</p>
                </div>
              </div>

              <ul className="flex flex-col gap-3">
                {POINTS.map(({ icon: Icon, key }) => (
                  <li key={key} className="flex items-center gap-3">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-wp-track text-wp-fg-secondary">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium leading-normal text-wp-fg">{t(key)}</span>
                  </li>
                ))}
              </ul>

              {/* Names the control that now exists. This used to point at "the user menu", which
                  the demo hid entirely — so the one instruction for getting an account described a
                  button that was not on screen. It is in the footer now, beside "Got it". */}
              <div className="flex gap-2.5 rounded-[10px] bg-wp-accent-soft px-3.5 py-3">
                <Info size={16} className="mt-px shrink-0 text-wp-accent" aria-hidden="true" />
                <p className="text-[13px] font-medium leading-[1.45] text-wp-fg">{t("demo.callout")}</p>
              </div>
            </Modal.Body>
            <Modal.Footer className="mt-0 gap-2 px-7 pt-5 pb-6">
              {signupUrl && (
                <Button variant="secondary" onPress={() => { window.location.href = signupUrl; }}>
                  {t("actions.sign_up")}
                </Button>
              )}
              <Button variant="primary" className="px-5" onPress={onClose}>
                {t("demo.got_it")}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
