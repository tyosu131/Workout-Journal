import React, { useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Textarea, IconButton, CloseButton, useToast, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { FaUser, FaEnvelope } from "react-icons/fa";
import { useRouter } from 'next/router';

const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Form submitted.",
      description: "We've received your message.",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleClose = () => {
    router.push("/");
  };

  return (
    <Box maxW="md" mx="auto" mt={10} p={8} boxShadow="lg" borderRadius="md" position="relative">
      <IconButton
        aria-label="Close"
        icon={<CloseButton />}
        onClick={handleClose}
        position="absolute"
        top={2}
        right={2}
        variant="ghost"
        size="lg"
      />
      <Box as="form" onSubmit={handleSubmit}>
        <FormControl id="name" mb={6} isRequired>
          <FormLabel fontSize="lg">Name</FormLabel>
          <InputGroup>
            <InputLeftElement
              pointerEvents="none"
              display="flex"
              alignItems="center"
              height="100%"
            >
              <FaUser color="gray.300" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              pl="3rem"
              fontSize="lg"
              py={6}
            />
          </InputGroup>
        </FormControl>
        <FormControl id="email" mb={6} isRequired>
          <FormLabel fontSize="lg">Email</FormLabel>
          <InputGroup>
            <InputLeftElement
              pointerEvents="none"
              display="flex"
              alignItems="center"
              height="100%"
            >
              <FaEnvelope color="gray.300" />
            </InputLeftElement>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              pl="3rem"
              fontSize="lg"
              py={6}
            />
          </InputGroup>
        </FormControl>
        <FormControl id="message" mb={6} isRequired>
          <FormLabel fontSize="lg">Message</FormLabel>
          <Textarea
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            resize="none"
            overflowY="auto"
            maxH="200px"
            fontSize="lg"
            py={6}
          />
        </FormControl>
        <Button type="submit" colorScheme="blue" width="full" size="lg" fontSize="lg" py={6}>
          Submit
        </Button>
      </Box>
    </Box>
  );
};

export default ContactPage;
