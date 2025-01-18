// useUserEdit.ts
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
    password: "******", // 初期状態ではマスク
  });

  const toast = useToast();

  // 特定フィールドのみ編集可能にする
  const handleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prevState) => ({ ...prevState, [field]: true }));
    if (field === "password") {
      // パスワードの編集が開始されたら空文字に初期化
      setUserData((prevState) => ({ ...prevState, password: "" }));
    }
  };

  // 編集モードを一括リセット
  const resetEditing = () => {
    setIsEditing({
      username: false,
      email: false,
      password: false,
    });
  };

  // データ保存 (1秒間隔でデバウンス)
  const handleSave = debounce(async (data: { username: string; email: string; password: string }) => {
    const { username, email, password } = data;

    try {
      // ローカルストレージからトークン取得 (他ファイルと同じロジック)
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No valid session found. Please log in again.");
      }

      // バックエンドのAPIにPUTリクエスト
      const response = await axios.put(
        "http://localhost:3001/api/auth/update-user",
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

      // 例: サーバー側が「パスワード変更後は再ログインして」と指示するケース
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

      // "axios.isAxiosError" を使ってサーバーの返す error メッセージを最優先で表示
      if (axios.isAxiosError(error)) {
        const serverError = error.response?.data?.error;
        if (serverError) {
          errorMsg = serverError; // 例: "Invalid email format"
        } else if (error.message) {
          errorMsg = error.message;
        }
      } else if (error instanceof Error) {
        // AxiosError でなく普通の Error の場合
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
