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
  Button
} from "@chakra-ui/react";
import { FaUser, FaEnvelope } from "react-icons/fa";
import useAutosizeTextAreaEffect from '../../hooks/useAutosizeTextArea';

interface ContactProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Contact: React.FC<ContactProps> = memo(({ isOpen, onClose }) => {
  const [message, setMessage] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useAutosizeTextAreaEffect(textAreaRef.current, message);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      autoFocus={false}
      motionPreset="slideInBottom"
    >
      <ModalOverlay />
      <ModalContent maxWidth="800px" mx="auto" pb={6}>
        <ModalHeader fontSize="3xl" textAlign="center">Contact</ModalHeader>
        <ModalBody mx={4} display="flex" justifyContent="center" pt="50px">
          <Stack spacing={10} width="100%" pt="80px">
            <FormControl>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none" height="100%">
                  <FaUser color="gray.300" />
                </InputLeftElement>
                <Input placeholder="Name" py={6} fontSize="lg" width="100%" height={20} pl={20} />
              </InputGroup>
            </FormControl>
            <FormControl>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none" height="100%">
                  <FaEnvelope color="gray.300" />
                </InputLeftElement>
                <Input placeholder="Email" py={6} fontSize="lg" width="100%" height={20} pl={20} />
              </InputGroup>
            </FormControl>
            <FormControl>
              <Textarea
                ref={textAreaRef}
                placeholder="Message"
                fontSize="lg"
                py={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ resize: "none" }}
                rows={6}
                width="99%"
                height="60px"
              />
            </FormControl>
            <Button colorScheme="blue" size="lg" py={6} width="100%" height="50px">Submit</Button>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
});

Contact.displayName = "Contact";
export default Contact;
