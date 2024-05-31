import React, { useRef, useState, memo } from "react";
import {
  FormControl,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  Textarea,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Button, 
  ButtonGroup
} from "@chakra-ui/react";
import useAutosizeTextArea from '../../hooks/useAutosizeTextArea';

interface ContactProps {
  isOpen: boolean;
  onClose: () => void;
}

const Contact: React.FC<ContactProps> = memo(({ isOpen, onClose }) => {
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useAutosizeTextArea(textAreaRef.current, message);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      autoFocus={false}
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent maxWidth="500px" mx="auto" pb={2} alignItems="center">
        <ModalHeader>Contact</ModalHeader>
        <ModalBody mx={4} display="flex" justifyContent="center">
          <Stack spacing={4} width="100%">
            <FormControl>
              <InputGroup>
                <Input placeholder="Name" size="lg" />
              </InputGroup>
            </FormControl>
            <FormControl>
              <InputGroup>
                <Input placeholder="Email" size="lg" />
              </InputGroup>
            </FormControl>
            <FormControl>
              <Textarea
                ref={textAreaRef}
                placeholder="Message"
                size="lg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: "none" }}
              />
            </FormControl>
            <Button colorScheme='blue'>Button</Button>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});

Contact.displayName = "Contact";
export default Contact;
