import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiRequestWithAuth } from "../../../lib/apiClient";
import { API_ENDPOINTS } from "../../../../shared/constants/endpoints";

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const sessionRes = await apiRequestWithAuth<{ user?: any }>(
          API_ENDPOINTS.SESSION,
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
