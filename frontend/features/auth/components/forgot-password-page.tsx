// portfolio real\frontend\features\auth\components\forgot-password-page.tsx
import React, { useRef, useState } from 'react';
import { Alert, AlertDescription, AlertIcon, Box, Input, Button, Center, Text, Link } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { apiRequest } from '../../../lib/apiClient';
import { API_ENDPOINTS } from '../../../../shared/constants/endpoints';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const isSubmittingRef = useRef(false);
  const router = useRouter();

  const handlePasswordReset = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await apiRequest(API_ENDPOINTS.FORGOT_PASSWORD, 'post', { email });
      setFeedback("success");
    } catch {
      setFeedback("error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
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
        <Button
          onClick={handlePasswordReset}
          width="100%"
          colorScheme="blue"
          isLoading={isSubmitting}
          loadingText="Requesting"
          isDisabled={isSubmitting}
        >
          Request a password reset
        </Button>
        {feedback === "success" && (
          <Alert status="success" mt={4} textAlign="left">
            <AlertIcon />
            <AlertDescription>
              If an account exists for this email, you’ll receive a password reset link shortly.
            </AlertDescription>
          </Alert>
        )}
        {feedback === "error" && (
          <Alert status="error" mt={4} textAlign="left">
            <AlertIcon />
            <AlertDescription>
              We couldn’t process your request. Please try again shortly.
            </AlertDescription>
          </Alert>
        )}
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
