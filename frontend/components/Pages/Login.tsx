import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { setToken } from "../../utils/tokenUtils";
import { validateEmail } from "../../utils/validationUtils";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async () => {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const result = await response.json();
      setToken(result.token);  // トークン設定
      router.push('/top');      // トークン設定後に遷移

      toast({
        title: 'Login successful',
        description: 'Redirecting to the top...',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
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
          <Link color="blue.500" onClick={() => router.push('/signup')}>Do not have an account? Sign up</Link>
        </Text>
        <Text mt={4}>
          <Link color="blue.500" onClick={() => router.push('/forgot-password')}>Forgot your password?</Link>
        </Text>
      </Box>
    </Center>
  );
};

export default Login;
