// C:\Users\User\Desktop\web Development Projects\portfolio real\frontend\components\forms\LoginForm.tsx
import React, { useState } from "react";
import { Box, Input, Button, useToast } from "@chakra-ui/react";
import axios from "axios";
import { useRouter } from "next/router"; // next/routerを使用
import { setToken } from "../../../../shared/utils/tokenUtils"; // トークン保存の関数をインポート
import { validateEmail } from "../../../../shared/utils/validationUtils";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const toast = useToast();
  const router = useRouter(); // useNavigateから変更

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防止

    if (!validateEmail(email)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await axios.post("http://localhost:3001/api/login", { email, password });
      setToken(response.data.token); // トークンを保存
      toast({
        title: "Login Successful",
        description: "You have successfully logged in.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.push("/"); // navigateから変更
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Invalid email or password. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box width="400px">
      <form onSubmit={handleLogin}>
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          mb={4}
          size="lg"
          required
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb={6}
          size="lg"
          required
        />
        <Button type="submit" width="100%" size="lg" colorScheme="teal">
          Log In
        </Button>
      </form>
    </Box>
  );
};

export default LoginForm;
