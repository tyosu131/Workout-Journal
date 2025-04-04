// portfolio real\frontend\features\auth\components\verify-email-page.tsx
import { Box, Button, Text, Center } from "@chakra-ui/react";
import { useRouter } from "next/router";

const VerifyEmail = () => {
  const router = useRouter();

  return (
    <Center height={{ base: 'auto', md: '100vh' }}>
      <Box width={{ base: '90%', md: '400px' }} textAlign="center">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Email Verification Required
        </Text>
        <Text mb={4}>
          We&apos;ve sent a verification email to your email address. Please check your inbox and verify your account.
        </Text>
        <Button colorScheme="blue" onClick={() => router.push("/login")}>
          Go to Login
        </Button>
      </Box>
    </Center>
  );
};

export default VerifyEmail;
