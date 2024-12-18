import React, { useState } from 'react';
import { Box, Input, Button, useToast, Center, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useResendVerification } from '../../hooks/useResendVerification';
import { apiRequestWithAuth } from '../../utils/apiClient';
import { URLS } from '../../constants/urls';

const SignUp: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const toast = useToast();
  const router = useRouter();

  const { resendVerification } = useResendVerification(email, name, password);

  const handleSignUp = async () => {
    try {
      const result = await apiRequestWithAuth(
        '/api/signup',
        'post',
        { email, name, password }
      );

      setIsVerificationSent(true);
      setCanResend(false);
      toast({
        title: 'Signup successful!',
        description: 'A verification email has been sent to your email address.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'There was an error signing up. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

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
