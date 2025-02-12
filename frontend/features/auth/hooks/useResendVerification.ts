import { useToast } from '@chakra-ui/react';
import { apiRequestWithAuth } from '../../../lib/apiClient';

export const useResendVerification = (email: string, name: string, password: string) => {
  const toast = useToast();

  const resendVerification = async () => {
    try {
      const result = await apiRequestWithAuth(
        '/api/signup',
        'post',
        { email, name, password }
      );
      toast({
        title: 'Verification email re-sent!',
        description: 'A new verification email has been sent to your email address.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification email.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return { resendVerification };
};