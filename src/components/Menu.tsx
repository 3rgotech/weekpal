import React from "react";
import IconButton from "./IconButton";
import { icons } from "../utils/icon";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Button } from "@heroui/react";

interface MenuProps {
  title: React.ReactNode; // Accepte du texte ou du JSX
  icon: keyof typeof icons;
  buttonClassName?: string;
}

const Menu: React.FC<MenuProps> = ({ title, icon, buttonClassName }) => {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  return (
    <>
      <IconButton
        icon={icon}
        onClick={onOpen}
        size="md"
      />
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">{title}</ModalHeader>
              <ModalBody>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Nullam pulvinar risus non risus hendrerit venenatis.
                  Pellentesque sit amet hendrerit risus, sed porttitor quam.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button color="primary" onPress={onClose}>
                  Action
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
export default Menu;
