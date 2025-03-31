// portfolio real\frontend\features\auth\components\reset-password-page.tsx

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Center, Box, Text, Input, Button, useToast } from "@chakra-ui/react";
import { apiRequest } from "../../../lib/apiClient";

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const [accessToken, setAccessToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // ハッシュからトークン取得
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
      }
    }
  }, []);

  const handleSave = async () => {
    if (!accessToken) {
      toast({
        title: "Error",
        description: "Missing or invalid reset token.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (!newPassword || !confirmPass) {
      toast({
        title: "Error",
        description: "Please fill all password fields.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (newPassword !== confirmPass) {
      toast({
        title: "Mismatch",
        description: "New password does not match Confirm.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      await apiRequest("/auth/reset-password", "put", {
        accessToken,
        newPassword,
      });

      toast({
        title: "Success!",
        description: "Password updated. Please log in again.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Failed to reset password:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to reset password.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Center height={{ base: "auto", md: "100vh" }} py={{ base: 8, md: 0 }} bg="gray.50">
      <Box
        bg="white"
        p={8}
        borderRadius="md"
        boxShadow="md"
        width={{ base: "90%", md: "400px" }}
        textAlign="center"
      >
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Reset Your Password
        </Text>
        <Text fontSize="sm" color="gray.500" mb={6}>
          Please choose a new password
        </Text>

        <Input
          placeholder="New Password"
          type="password"
          mb={4}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          placeholder="Confirm Password"
          type="password"
          mb={6}
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
        />

        <Button colorScheme="blue" width="100%" onClick={handleSave}>
          Save
        </Button>
      </Box>
    </Center>
  );
};

export default ResetPasswordPage;
