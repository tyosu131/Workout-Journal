import { useState } from "react";
import debounce from "lodash.debounce";
import supabase from "../../backend/supabaseClient";
import { useToast } from "@chakra-ui/react";
import axios from "axios"; // axiosをインポート

export const useUserEdit = () => {
  const [isEditing, setIsEditing] = useState({
    username: false,
    email: false,
    password: false,
  });

  const [userData, setUserData] = useState({
    username: "",
    email: "",
    password: "******", // 初期状態ではマスク
  });

  const toast = useToast();

  const handleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prevState) => ({ ...prevState, [field]: true }));
    if (field === "password") {
      setUserData((prevState) => ({ ...prevState, password: "" })); // パスワードを編集可能に
    }
  };

  const resetEditing = () => {
    setIsEditing({
      username: false,
      email: false,
      password: false,
    });
  };

  const handleSave = debounce(async (data: { username: string; email: string; password: string }) => {
    const { username, email, password } = data;
    try {
      // セッション情報を取得
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        throw new Error("No session found, please log in again.");
      }

      const token = sessionData.session.access_token;

      if (!token) {
        throw new Error("No valid session found.");
      }

      // バックエンドのAPIにaxiosでリクエストを送信
      const response = await axios.put("http://localhost:3001/api/update-user", {
        username,
        email,
        password,
      }, {
        headers: {
          Authorization: `Bearer ${token}`, // セッショントークンをヘッダーに含める
        },
      });

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
      if (error instanceof Error) {
        console.error("Error updating user:", error.message);
        toast({
          title: "Error!",
          description: `Failed to update user data: ${error.message}`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      } else {
        console.error("Unexpected error:", error);
        toast({
          title: "Error!",
          description: `An unexpected error occurred.`,
          status: "error",
          duration: 4000,
          isClosable: true,
        });
      }
    } finally {
      resetEditing(); // 保存後に編集モードをリセット
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
