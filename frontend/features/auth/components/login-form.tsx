// portfolio real\frontend\features\auth\components\login-form.tsx
import React, { useState } from "react";
import { Box, Input, Button, useToast } from "@chakra-ui/react";
import axios from "axios";
import { useRouter } from "next/router";
import { setToken } from "../../../../shared/utils/tokenUtils";
import { validateEmail } from "../../../../shared/utils/validationUtils";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const toast = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const response = await axios.post("/api/auth/login", { email, password });
      setToken(response.data.token);
      toast({
        title: "Login Successful",
        description: "You have successfully logged in.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      router.push("/");
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
    <Box width={{ base: '90%', md: '400px' }}>
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
