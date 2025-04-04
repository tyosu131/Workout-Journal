// portfolio real\frontend\features\contact\components\ContactPage.tsx
import React from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  IconButton,
  CloseButton,
  useToast,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { FaUser, FaEnvelope } from "react-icons/fa";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  email: z.string().email("無効なメールアドレスです"),
  message: z.string().min(1, "メッセージは必須です"),
});

type ContactFormInputs = z.infer<typeof contactSchema>;

interface ContactProps {
  isOpen: boolean;
  onClose: () => void;
}

const Contact: React.FC<ContactProps> = ({ isOpen, onClose }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormInputs>({
    resolver: zodResolver(contactSchema),
  });
  const toast = useToast();
  const router = useRouter();

  const onSubmit = (data: ContactFormInputs) => {
    toast({
      title: "Form submitted.",
      description: "We've received your message.",
      status: "success",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleClose = () => {
    onClose();
    router.push("/top");
  };

  return (
    <Box
      /* ★ レスポンシブ: モバイルは幅90% */
      maxW={{ base: "90%", lg: "5xl" }}
      mx="auto"
      mt={10}
      p={8}
      boxShadow="lg"
      borderRadius="md"
      position="relative"
    >
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
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <FormControl id="name" mb={8} isInvalid={!!errors.name}>
          <FormLabel fontSize="lg">Name</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none" display="flex" alignItems="center" height="100%">
              <FaUser color="gray.300" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Name"
              {...register("name")}
              pl="3rem"
              fontSize="lg"
              py={6}
            />
          </InputGroup>
          {errors.name && (
            <Box color="red.500" fontSize="sm" mt={2}>
              {errors.name.message}
            </Box>
          )}
        </FormControl>

        <FormControl id="email" mb={8} isInvalid={!!errors.email}>
          <FormLabel fontSize="lg">Email</FormLabel>
          <InputGroup>
            <InputLeftElement pointerEvents="none" display="flex" alignItems="center" height="100%">
              <FaEnvelope color="gray.300" />
            </InputLeftElement>
            <Input
              type="email"
              placeholder="Email"
              {...register("email")}
              pl="3rem"
              fontSize="lg"
              py={6}
            />
          </InputGroup>
          {errors.email && (
            <Box color="red.500" fontSize="sm" mt={2}>
              {errors.email.message}
            </Box>
          )}
        </FormControl>

        <FormControl id="message" mb={8} isInvalid={!!errors.message}>
          <FormLabel fontSize="lg">Message</FormLabel>
          <Textarea
            {...register("message")}
            resize="none"
            overflowY="auto"
            minH="200px"
            fontSize="md"
            py={6}
          />
          {errors.message && (
            <Box color="red.500" fontSize="sm" mt={2}>
              {errors.message.message}
            </Box>
          )}
        </FormControl>

        <Box display="flex" justifyContent="center">
          <Button
            type="submit"
            colorScheme="blue"
            width="calc(25% - 20px)"
            borderRadius="full"
            height="50px"
            fontSize="lg"
            transition="all 0.2s"
            _hover={{ transform: "scale(1.02)" }}
          >
            Submit
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Contact;
