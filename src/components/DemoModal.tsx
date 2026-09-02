import React from "react";
import { Alert, Button, Modal } from "@heroui/react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  return (
    /* No `Modal.CloseTrigger` below: that is how v3 spells the old `hideCloseButton`. */
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop isDismissable={false}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Demo Mode</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>You are currently using WeekPal in demo mode.</Alert.Title>
                </Alert.Content>
              </Alert>
              <p className="text-sm pl-4">This means that:</p>
              <ul className="list-disc list-inside space-y-1 text-sm pl-8">
                <li>All data is stored locally in your browser</li>
                <li>Changes you make will not be saved when you leave the demo</li>
                <li>Sample data has been pre-loaded for demonstration purposes</li>
              </ul>
              <p className="text-sm pl-4">
                You can use the demo mode to get a feel for the app and its
                features.
              </p>
              {/* Names the control that now exists. This used to point at "the user menu", which
                  the demo hid entirely — so the one instruction for getting an account described a
                  button that was not on screen. */}
              <Alert status="accent">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    Ready to keep your week? Sign up in the top right — it takes a moment, and the
                    demo data stays behind.
                  </Alert.Title>
                </Alert.Content>
              </Alert>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" onPress={onClose}>
                Got it
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
