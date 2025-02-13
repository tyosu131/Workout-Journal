import { apiRequest, apiRequestWithAuth } from "../../lib/apiClient";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";

interface LoginResponse {
  token: string;
  user?: any;
}

/**
 * ログイン API
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return await apiRequest<LoginResponse>(
    API_ENDPOINTS.LOGIN,
    "post",
    { email, password }
  );
}

/**
 * セッション情報を取得 (get-user 相当)
 */
export async function fetchSession(token: string) {
  // token は必要に応じて使わなくてもよい（apiRequestWithAuthで自動付加など）
  return await apiRequestWithAuth<{ user?: any }>(
    API_ENDPOINTS.SESSION,
    "get"
  );
}

/**
 * リフレッシュトークンでアクセストークンを更新
 */
export async function refreshAccessToken() {
  // bodyは空オブジェクト {} とする想定
  return await apiRequestWithAuth<{ access_token: string }>(
    API_ENDPOINTS.REFRESH,
    "post",
    {}
  );
}
