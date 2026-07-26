// portfolio real\frontend\features\auth\components\user-setting-page.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Button,
  Flex,
  Spacer,
  Divider,
  CloseButton,
  useToast,
} from "@chakra-ui/react";
import { FaEdit } from "react-icons/fa";
import { useRouter } from "next/router";
import { useUserEdit } from "../hooks/useUserEdit";
import { apiRequestWithAuth } from "../../../lib/apiClient";
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";
import { getToken } from "../../../../shared/utils/tokenUtils";

const UserSettings: React.FC = () => {
  const { isEditingUsername, handleEdit, handleSave, userData, setUserData } = useUserEdit();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setIsClient(true);

    const fetchUserData = async () => {
      if (!getToken()) {
        console.error("No token found. Redirecting to login.");
        router.push("/login");
        return;
      }

      try {
        const data = await apiRequestWithAuth<{ name?: string; email?: string }>(
          API_ENDPOINTS.GET_USER,
          "get"
        );

        if (data) {
          setUserData({
            username: data.name || "No username set",
            email: data.email || "",
            password: "******",
          });
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error.message);
        if (error.response?.status === 401) {
          toast({
            title: "Session expired",
            description: "Please log in again.",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
          router.push("/login");
        } else {
          toast({
            title: "Error",
            description: "Failed to load user data.",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      }
    };

    fetchUserData();
  }, [setUserData, toast, router]);

  const handleClose = () => {
    router.push("/top");
  };

  if (!isClient) return null;

  return (
    <Box
      maxW={{ base: "90%", lg: "5xl" }}
      mx="auto"
      mt={10}
      p={8}
      boxShadow="lg"
      borderRadius="md"
      position="relative"
    >
      <IconButton
        aria-label="Close"
        icon={<CloseButton />}
        onClick={handleClose}
        position="absolute"
        top={2}
        right={2}
        variant="ghost"
        size="lg"
      />
      <Box fontSize="2xl" fontWeight="bold" textAlign="center" mb={100}>
        Account Settings
      </Box>

      <FormControl mb={8}>
        <Flex alignItems="center">
          <FormLabel fontSize="lg" w="40%">User Name</FormLabel>
          {isEditingUsername ? (
            <>
              <Input
                value={userData.username}
                onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                fontSize="lg"
                w="60%"
              />
              <Button onClick={() => handleSave(userData)} ml={3} colorScheme="blue">
                Save
              </Button>
            </>
          ) : (
            <>
              <Box flex="1">{userData.username}</Box>
              <Spacer />
              <IconButton
                icon={<FaEdit />}
                aria-label="Edit username"
                onClick={handleEdit}
              />
            </>
          )}
        </Flex>
        <Divider mt={2} />
      </FormControl>

      <FormControl mb={8}>
        <Flex alignItems="center">
          <FormLabel fontSize="lg" w="40%">E-Mail</FormLabel>
          <Box flex="1">{userData.email}</Box>
        </Flex>
        <Box fontSize="sm" color="gray.500" mt={2}>Email changes are not implemented.</Box>
        <Divider mt={2} />
      </FormControl>

      <FormControl mb={8}>
        <Flex alignItems="center">
          <FormLabel fontSize="lg" w="40%">Password</FormLabel>
          <Box flex="1">******</Box>
        </Flex>
        <Box fontSize="sm" color="gray.500" mt={2}>Password changes are not implemented.</Box>
        <Divider mt={2} />
      </FormControl>
    </Box>
  );
};

export default UserSettings;
