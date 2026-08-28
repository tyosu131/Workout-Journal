import { apiRequest, apiRequestWithAuth } from "../../lib/apiClient";
import { API_ENDPOINTS } from "../../../shared/constants/endpoints";

interface LoginResponse {
  token: string;
  user?: any;
}

/**
 * Login API
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return await apiRequest<LoginResponse>(
    API_ENDPOINTS.LOGIN,
    "post",
    { email, password }
  );
}

export async function logoutUser(): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.LOGOUT, "post", {});
}

/**
 * Get session information (equivalent to get-user)
 */
export async function fetchSession(token: string) {
  return await apiRequestWithAuth<{ user?: any }>(
    API_ENDPOINTS.SESSION,
    "get"
  );
}

/**
 * Refresh an access token with a refresh token
 */
export async function refreshAccessToken() {
  return await apiRequest<{ access_token: string }>(
    API_ENDPOINTS.REFRESH,
    "post",
    {}
  );
}
