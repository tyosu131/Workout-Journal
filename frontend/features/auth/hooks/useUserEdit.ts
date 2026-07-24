import { useState } from "react";
import debounce from "lodash.debounce";
import axios from "axios";
import { useToast } from "@chakra-ui/react";

export const useUserEdit = () => {
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "******",
  });

  const toast = useToast();

  const handleEdit = () => setIsEditingUsername(true);

  const resetEditing = () => setIsEditingUsername(false);

  const handleSave: (data: { username: string; email: string }) => void =
    debounce(async (data: { username: string; email: string }) => {
      const { username, email } = data;
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No valid session found. Please log in again.");
        }
        const response = await axios.put(
          "/api/auth/update-user",
          { username, email },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.status !== 200) {
          throw new Error("Failed to update user.");
        }
        toast({
          title: "Saved!",
          description: "Username has been updated.",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        let errorMsg = "An unexpected error occurred.";
        if (axios.isAxiosError(error)) {
          const serverError = error.response?.data?.error;
          if (serverError) {
            errorMsg = serverError;
          } else if (error.message) {
            errorMsg = error.message;
          }
        } else if (error instanceof Error) {
          errorMsg = error.message;
        }
        console.error("Error updating user:", errorMsg);
        toast({
          title: "Error!",
          description: `Failed to update user data: ${errorMsg}`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } finally {
        resetEditing();
      }
    }, 1000);

  return {
    isEditingUsername,
    handleEdit,
    handleSave,
    userData,
    setUserData,
    resetEditing,
  };
};
