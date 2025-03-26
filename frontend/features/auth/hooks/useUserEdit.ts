import { useState } from "react";
import debounce from "lodash.debounce";
import axios from "axios";
import { useToast } from "@chakra-ui/react";

export const useUserEdit = () => {
  const [isEditing, setIsEditing] = useState({
    username: false,
    email: false,
    password: false,
  });

  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "******",
  });

  const toast = useToast();

  const handleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prevState) => ({ ...prevState, [field]: true }));
    if (field === "password") {
      setUserData((prevState) => ({ ...prevState, password: "" }));
    }
  };

  const resetEditing = () => {
    setIsEditing({
      username: false,
      email: false,
      password: false,
    });
  };

  const handleSave: (data: { username: string; email: string; password: string }) => void =
    debounce(async (data: { username: string; email: string; password: string }) => {
      const { username, email, password } = data;
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No valid session found. Please log in again.");
        }
        const response = await axios.put(
          "/api/auth/update-user",
          { username, email, password },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.status !== 200) {
          throw new Error("Failed to update user.");
        }
        const result = response.data;
        if (result.message === "Password updated successfully. Please log in again.") {
          toast({
            title: "Password Updated",
            description: "Please log in again with the new password.",
            status: "warning",
            duration: 4000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Saved!",
            description: `User data has been updated.`,
            status: "success",
            duration: 2000,
            isClosable: true,
          });
        }
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
    isEditing,
    handleEdit,
    handleSave,
    userData,
    setUserData,
    resetEditing,
  };
};
