import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import supabase from '../../../backend/supabaseClient';

const SignUp: React.FC = () => {
  const [name, setName] = useState(''); // 名前フィールドを追加
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const toast = useToast();
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      console.log("Signing up with", { email, password, name });

      // Supabaseのauth.signUpを使用してユーザーを登録
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // 新規ユーザーをカスタムのusersテーブルに追加
      const user = data.user;

      if (user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ name, email, password }]); // nameフィールドを挿入

        if (insertError) {
          throw insertError;
        }

        toast({
          title: 'Signup successful!',
          description: 'You have been registered successfully.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        // メール確認後にトップページへリダイレクト
        router.push('/login');
      } else {
        throw new Error('User data is missing in the response');
      }
    } catch (error: any) {
      console.error("Signup error:", error.message);
      toast({
        title: 'Error',
        description: error.message || 'There was an error signing up. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Center height="100vh">
      <Box width="400px" textAlign="center">
        <Text fontSize="2xl" fontWeight="bold">Welcome!</Text>
        <Input
          placeholder="Please enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
        <Button onClick={handleSignUp} width="100%" colorScheme="blue">Sign Up</Button>
        <Text mt={4}>
          <Link color="blue.500" onClick={() => router.push('/login')}>Already have an account? Log in</Link>
        </Text>
      </Box>
    </Center>
  );
};

export default SignUp;
