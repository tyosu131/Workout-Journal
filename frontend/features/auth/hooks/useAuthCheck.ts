import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { apiRequestWithAuth } from "../../../../shared/utils/apiClient";

export const useAuthCheck = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        // 自前のAPI: GET /api/auth/session
        const sessionRes = await apiRequestWithAuth<{ user?: any }>(
          "/api/auth/session",
          "get"
        );
        // sessionRes.user があれば認証済み
        if (sessionRes?.user) {
          setIsAuthenticated(true);
        } else {
          // ユーザが無いなら未認証 → /login へ
          router.push("/login");
        }
      } catch (error) {
        // API呼び出し失敗 or 401エラーなど → ログインへ
        router.push("/login");
      }
    };

    checkUser();
  }, [router]);

  return isAuthenticated;
};
