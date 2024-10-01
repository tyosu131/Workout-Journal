import { useState } from "react";
import debounce from "lodash.debounce";
import supabase from "../../backend/supabaseClient"; 
import { useToast } from "@chakra-ui/react";
import axios from 'axios';

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

  const handleSave = debounce(async (data: { username: string; email: string; password: string }) => {
    const { username, email, password } = data;
    setIsEditing({
      username: false,
      email: false,
      password: false,
    });

    try {
      // Supabase Authでメールアドレスとパスワードを更新
      if (email || password !== "******") {
        const { error: authError } = await supabase.auth.updateUser({
          email,
          password: password !== "******" ? password : undefined,
        });
        if (authError) throw authError;
      }

      // DBの`users`テーブルにメールアドレスを更新
      const { data, error } = await supabase
        .from("users")
        .update({ email, name: username })
        .eq("id", (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: `User data has been updated.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      // 型ガードを追加
      if (error instanceof Error) {
        console.error("Error updating user:", error);
        toast({
          title: "Error!",
          description: `Failed to update user data: ${error.message}`,
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      } else {
        console.error("Unexpected error:", error);
        toast({
          title: "Error!",
          description: `An unexpected error occurred.`,
          status: "error",
          duration: 2000,
          isClosable: true,
        });
      }
    }
  }, 1000);

  return {
    isEditing,
    handleEdit,
    handleSave,
    userData,
    setUserData,
  };
};
