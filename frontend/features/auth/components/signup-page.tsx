// portfolio real\frontend\features\auth\components\signup-page.tsx
import React, { useState } from "react";
import { Box, Input, Button, useToast, Center, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";

import { apiRequest } from "../../../lib/apiClient";
import { setToken } from "../../../../shared/utils/tokenUtils";
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";

type SignupResponse = {
  token?: string;
  user?: any;
  verificationRequired?: boolean;
};

const SignUp: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      const result = await apiRequest<SignupResponse>(
        API_ENDPOINTS.SIGNUP,
        "post",
        { email, username, password }
      );

      if (result.verificationRequired || !result.token) {
        setVerificationRequired(true);
        toast({
          title: "Confirm your email",
          description: "Check your inbox, then log in after confirming your email address.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      setToken(result.token);

      toast({
        title: "Signup successful!",
        description: "Your account is ready to use.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.push("/top");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "There was an error signing up. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (verificationRequired) {
    return (
      <Center height={{ base: 'auto', md: '100vh' }}>
        <Box width={{ base: '90%', md: '400px' }} textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">
            Email Verification Required
          </Text>
          <Text mt={4}>
            Confirm your email address before logging in. Verification resend is not available yet.
          </Text>
          <Button mt={4} onClick={() => setVerificationRequired(false)}>
            Back to Sign Up
          </Button>
        </Box>
      </Center>
    );
  }

  return (
    <Center height={{ base: 'auto', md: '100vh' }}>
      <Box width={{ base: '90%', md: '400px' }} textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" pb={4}>
          Welcome
        </Text>
        <Input
          placeholder="Please enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          mb={4}
        />
        <Input
          placeholder="Please enter your e-mail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          mb={4}
        />
        <Input
          placeholder="Enter your password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb={4}
        />
        <Button onClick={handleSignUp} width="100%" colorScheme="blue">
          Sign Up
        </Button>
      </Box>
    </Center>
  );
};

export default SignUp;
