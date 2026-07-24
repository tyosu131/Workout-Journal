// portfolio real\frontend\features\auth\components\reset-password-page.tsx

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Center, Box, Text, Input, Button, useToast } from "@chakra-ui/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRecoveryAuthClient } from "../../../lib/supabaseAuthClient";
import {
  establishPasswordRecoverySession,
  startPasswordRecoveryInitialization,
  updateRecoveredPassword,
} from "../utils/passwordRecovery";

const ResetPasswordPage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryReady, setRecoveryReady] = useState(false);
  const recoveryClientRef = useRef<SupabaseClient | null>(null);
  const recoveryInitializationStartedRef = useRef(false);
  const recoveryInitializationPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const recoveryInitialization = startPasswordRecoveryInitialization(
      recoveryInitializationStartedRef,
      recoveryInitializationPromiseRef,
      async () => {
        const client = createRecoveryAuthClient();
        recoveryClientRef.current = client;
        await establishPasswordRecoverySession(client, window.location);
      }
    );

    if (!recoveryInitialization) return;
    recoveryInitialization
      .then(() => {
        if (cancelled) return;
        window.history.replaceState({}, document.title, window.location.pathname);
        setRecoveryReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setRecoveryError(
          error instanceof Error ? error.message : "Unable to verify the password recovery link."
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!recoveryReady || !recoveryClientRef.current) {
      toast({
        title: "Error",
        description: recoveryError || "The password recovery link is invalid or expired.",
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
      await updateRecoveredPassword(recoveryClientRef.current, newPassword);

      toast({
        title: "Success!",
        description: "Password updated. Please log in again.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      router.push("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password.",
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
          {recoveryError || "Please choose a new password"}
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

        <Button colorScheme="blue" width="100%" onClick={handleSave} isDisabled={!recoveryReady}>
          Save
        </Button>
      </Box>
    </Center>
  );
};

export default ResetPasswordPage;
