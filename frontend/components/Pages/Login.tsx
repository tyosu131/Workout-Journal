import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

// 環境変数を使用してSupabaseクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_KEY || ''
);

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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: 'Login successful',
        description: 'Redirecting to the top...',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setTimeout(() => {
        router.push('/top').then(() => {
          console.log("Redirected to TOP_PAGE successfully.");
        }).catch((err) => {
          console.error("Redirect failed:", err);
        });
      }, 1000);
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'An error occurred during login. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // メールアドレスの形式を検証する関数
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
