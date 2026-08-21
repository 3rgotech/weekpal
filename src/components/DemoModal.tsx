import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
} from "@heroui/react";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hideCloseButton
      isDismissable={false}
      size="xl"
    >
      <ModalContent>
        <ModalHeader className="dark:text-white">Demo Mode</ModalHeader>
        <ModalBody className="dark:text-white">
          <Alert
            color="warning"
            title="You are currently using WeekPal in demo mode."
          />
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
          <Alert
            color="primary"
            title="Ready to keep your week? Sign up in the top right — it takes a moment, and the demo data stays behind."
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={onClose}>
            Got it
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
