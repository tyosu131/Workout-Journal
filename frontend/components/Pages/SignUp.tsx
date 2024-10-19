import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';

const SignUp: React.FC = () => {
  const [name, setName] = useState(''); // 名前フィールドを追加
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false); // メール確認状態の管理
  const [canResend, setCanResend] = useState(true); // 再送可能かを管理
  const toast = useToast();
  const router = useRouter();

  const handleSignUp = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        setIsVerificationSent(true);
        setCanResend(false);
        toast({
          title: 'Signup successful!',
          description: 'A verification email has been sent to your email address.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to sign up');
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

  // メール確認の再送処理
  const resendVerification = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();
      if (response.ok) {
        setCanResend(false);
        toast({
          title: 'Verification email re-sent!',
          description: 'A new verification email has been sent to your email address.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to resend verification email');
      }
    } catch (error: any) {
      console.error("Resend verification error:", error.message);
      toast({
        title: 'Error',
        description: error.message || 'There was an error resending the email. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // メール確認が送信された場合の画面
  if (isVerificationSent) {
    return (
      <Center height="100vh">
        <Box width="400px" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold">Email Verification Required</Text>
          <Text mt={4}>
            A verification email has been sent to your email address. Please check your inbox and verify your account.
          </Text>
          <Button mt={4} onClick={() => setIsVerificationSent(false)}>Back to Sign Up</Button>
          <Button mt={4} onClick={resendVerification} isDisabled={!canResend}>Resend Verification Email</Button>
        </Box>
      </Center>
    );
  }

  return (
    <Center height="100vh">
      <Box width="400px" textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" pb={4}>Welcome</Text>
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
      </Box>
    </Center>
  );
};

export default SignUp;
