import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Button,
  useToast,
  Flex,
  Spacer,
  Divider,
  CloseButton,
} from "@chakra-ui/react";
import { FaEdit } from "react-icons/fa";
import { useRouter } from 'next/router';
import supabase from "../../../backend/supabaseClient";
import debounce from 'lodash.debounce';

const UserSettings: React.FC = () => {
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

  const [isClient, setIsClient] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // ユーザーIDを保存するための状態

  // ページの初回ロード時にユーザーデータを取得する
  useEffect(() => {
    setIsClient(true);

    const fetchUserData = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        setUserData({
          username: data.user.user_metadata?.username || "test",
          email: data.user.email || "test2@gmail.com",
          password: "******",
        });
        setUserId(data.user.id); // ユーザーIDを保存
      }
    };
    fetchUserData();
  }, []);

  const [tempPassword, setTempPassword] = useState("");

  const toast = useToast();
  const router = useRouter();

  const handleEdit = (field: keyof typeof isEditing) => {
    setIsEditing((prevState) => ({ ...prevState, [field]: true }));
    if (field === "password") {
      setTempPassword(""); // パスワード編集時は空にする
    }
  };

  const handleSave = debounce(async (field: keyof typeof isEditing) => {
    setIsEditing((prevState) => ({ ...prevState, [field]: false }));

    if (field === "password" && tempPassword !== "") {
      setUserData((prevState) => ({ ...prevState, password: "******" }));
    }

    try {
      // Supabaseのユーザー情報を更新するAPIリクエスト
      const response = await fetch("http://localhost:3001/api/update-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          password: tempPassword !== "" ? tempPassword : userData.password,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      // メールアドレス更新はスキップする（開発環境の場合）
      if (field === 'email' && userId) {
        // 開発環境用にメールアドレスの確認プロセスをスキップ
        // SupabaseのAuthを使わず、直接テーブルを更新する例
        const { error } = await supabase
          .from('users')
          .update({ email: userData.email })
          .eq('uuid', userId); // UUIDでフィルタ

        if (error) {
          throw error;
        }

        toast({
          title: "Email updated without confirmation!",
          description: `${userData.email} has been updated.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        return;
      }

      // 最新のユーザーデータを再取得して、状態を更新
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;

      setUserData({
        username: user?.user_metadata?.username || userData.username,
        email: user?.email || userData.email,
        password: "******",
      });

      toast({
        title: "Saved!",
        description: `${field} has been updated.`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });

    } catch (error) {
      toast({
        title: "Error!",
        description: `Failed to update ${field}.`,
        status: "error",
        duration: 2000,
        isClosable: true,
      });
    }
  }, 1000); // 1秒間のデバウンスを追加

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof userData) => {
    if (field === "password") {
      setTempPassword(e.target.value); // パスワード編集時は一時的に保存
    } else {
      setUserData((prevState) => ({ ...prevState, [field]: e.target.value }));
    }
  };

  const handleClose = () => {
    router.push('/top'); // トップページにリダイレクト
  };

  if (!isClient) {
    return null;
  }

  return (
    <Box maxW="5xl" mx="auto" mt={10} p={8} boxShadow="lg" borderRadius="md" position="relative">
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
          <FormLabel fontSize="lg" w="40%">
            User Name
          </FormLabel>
          {isEditing.username ? (
            <>
              <Input
                value={userData.username}
                onChange={(e) => handleChange(e, "username")}
                fontSize="lg"
                w="60%"
              />
              <Button onClick={() => handleSave("username")} ml={3} colorScheme="blue">
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
                onClick={() => handleEdit("username")}
              />
            </>
          )}
        </Flex>
        <Divider mt={2} />
      </FormControl>

      <FormControl mb={8}>
        <Flex alignItems="center">
          <FormLabel fontSize="lg" w="40%">
            E-Mail
          </FormLabel>
          {isEditing.email ? (
            <>
              <Input
                value={userData.email}
                onChange={(e) => handleChange(e, "email")}
                fontSize="lg"
                w="60%"
              />
              <Button onClick={() => handleSave("email")} ml={3} colorScheme="blue">
                Save
              </Button>
            </>
          ) : (
            <>
              <Box flex="1">{userData.email}</Box>
              <Spacer />
              <IconButton
                icon={<FaEdit />}
                aria-label="Edit email"
                onClick={() => handleEdit("email")}
              />
            </>
          )}
        </Flex>
        <Divider mt={2} />
      </FormControl>

      <FormControl mb={8}>
        <Flex alignItems="center">
          <FormLabel fontSize="lg" w="40%">
            Password
          </FormLabel>
          {isEditing.password ? (
            <>
              <Input
                type="password"
                value={tempPassword}
                onChange={(e) => handleChange(e, "password")}
                fontSize="lg"
                w="60%"
                placeholder="Enter new password"
              />
              <Button onClick={() => handleSave("password")} ml={3} colorScheme="blue">
                Save
              </Button>
            </>
          ) : (
            <>
              <Box flex="1">******</Box>
              <Spacer />
              <IconButton
                icon={<FaEdit />}
                aria-label="Edit password"
                onClick={() => handleEdit("password")}
              />
            </>
          )}
        </Flex>
        <Divider mt={2} />
      </FormControl>
    </Box>
  );
};

export default UserSettings;
