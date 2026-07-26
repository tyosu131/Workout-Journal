// portfolio real\frontend\features\auth\components\forgot-password-page.tsx
import React, { useState } from 'react';
import { Box, Input, Button, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { apiRequest } from '../../../lib/apiClient';
import { API_ENDPOINTS } from '../../../../shared/constants/endpoints';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handlePasswordReset = async () => {
    try {
      await apiRequest(API_ENDPOINTS.FORGOT_PASSWORD, 'post', { email });
    } catch (error) {
    }
  };

  return (
    <Center height={{ base: 'auto', md: '100vh' }}>
      <Box width={{ base: '90%', md: '400px' }} textAlign="center">
        <Text fontSize="2xl" fontWeight="bold">Did you forget your password?</Text>
        <Text mb={4}>Please enter the email address you used to create your account</Text>
        <Input
          placeholder="Please enter your e-mail address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          mb={4}
        />
        <Button onClick={handlePasswordReset} width="100%" colorScheme="blue">
          Request a password reset
        </Button>
        <Text mt={4}>
          <Link color="blue.500" cursor="pointer" onClick={() => router.push('/login')}>
            Return to login
          </Link>
        </Text>
      </Box>
    </Center>
  );
};

export default ForgotPassword;
