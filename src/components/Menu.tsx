import React from "react";
import IconButton from "./IconButton";
import { icons } from "../utils/icon";
import { Button, Modal, useOverlayState } from "@heroui/react";

interface MenuProps {
  title: React.ReactNode; // Accepte du texte ou du JSX
  icon: keyof typeof icons;
  buttonClassName?: string;
}

const Menu: React.FC<MenuProps> = ({ title, icon, buttonClassName }) => {
  const overlay = useOverlayState();

  return (
    <>
      <IconButton
        icon={icon}
        onClick={overlay.open}
        size="md"
      />
      <Modal state={overlay}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header className="flex flex-col gap-1">
                    <Modal.Heading>{title}</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Nullam pulvinar risus non risus hendrerit venenatis.
                      Pellentesque sit amet hendrerit risus, sed porttitor quam.
                    </p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="danger-soft" onPress={close}>
                      Close
                    </Button>
                    <Button variant="primary" onPress={close}>
                      Action
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};
export default Menu;
