import { useState } from "react";
import debounce from "lodash.debounce";
import { useToast } from "@chakra-ui/react";
import { apiRequestWithAuth } from "../../../lib/apiClient";
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";
import { getToken } from "../../../../shared/utils/tokenUtils";
import { getErrorSummary } from "../../../lib/errorSummary";

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
        if (!getToken()) {
          throw new Error("No valid session found. Please log in again.");
        }
        await apiRequestWithAuth(API_ENDPOINTS.UPDATE_USER, "put", { username, email });
        toast({
          title: "Saved!",
          description: "Username has been updated.",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } catch (error) {
        let errorMsg = "An unexpected error occurred.";
        if (typeof error === "object" && error !== null) {
          const responseError = error as {
            response?: { data?: { error?: unknown } };
            message?: unknown;
          };
          const serverError = responseError.response?.data?.error;
          if (typeof serverError === "string") {
            errorMsg = serverError;
          } else if (typeof responseError.message === "string") {
            errorMsg = responseError.message;
          }
        } else if (error instanceof Error) {
          errorMsg = error.message;
        }
        console.error("Error updating user:", getErrorSummary(error));
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
