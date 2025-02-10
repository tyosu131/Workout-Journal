import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { setToken } from "../../../../shared/utils/tokenUtils";
import { validateEmail } from "../../../../shared/utils/validationUtils";
import { URLS } from "../../../../shared/constants/urls";
import { apiRequest } from "../../../../shared/utils/apiClient";
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async () => {
    console.log("Attempting login with email:", email);

    if (!validateEmail(email)) {
      toast({
        title: 'Invalid email format',
        description: 'Please enter a valid email address.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const result: { token: string } = await apiRequest(API_ENDPOINTS.LOGIN, 'post', { email, password });

      console.log("Login successful, received token:", result.token);
      setToken(result.token);
      console.log("Token saved to localStorage:", localStorage.getItem("token"));
      router.push(URLS.TOP_PAGE);

      toast({
        title: 'Login successful',
        description: 'Redirecting to the top...',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: 'Login failed',
        description: `An error occurred: ${error.message}. Please try again later.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Center height="100vh">
      <Box width="400px" textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" pb={4}>Login</Text>
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          my={2}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          my={2}
        />
        <Button onClick={handleLogin} width="100%" colorScheme="blue" my={4}>Login</Button>
        <Text mt={4}>
          <Link color="blue.500" onClick={() => router.push(URLS.SIGNUP_PAGE)}>Do not have an account? Sign up</Link>
        </Text>
        <Text mt={4}>
          <Link color="blue.500" onClick={() => router.push(URLS.FORGOT_PASSWORD_PAGE)}>Forgot your password?</Link>
        </Text>
      </Box>
    </Center>
  );
};

export default Login;
