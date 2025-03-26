import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiRequestWithAuth } from "../../../lib/apiClient";

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const sessionRes = await apiRequestWithAuth<{ user?: any }>(
          "/api/auth/session",
          "get"
        );
        if (sessionRes?.user) {
          setIsAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch (error) {
        router.push("/login");
      }
    };

    checkUser();
  }, [router]);

  return isAuthenticated;
};
