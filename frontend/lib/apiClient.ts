// frontend/lib/apiClient.ts
import axios from 'axios';
import { getToken, setToken, removeToken } from '../../shared/utils/tokenUtils';
import { API_ENDPOINTS } from '../../shared/constants/endpoints';
import { getErrorSummary } from './errorSummary';

const apiClient = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Refresh retry count management ---
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;
const PUBLIC_AUTH_ENDPOINTS = new Set([
  API_ENDPOINTS.LOGIN,
  API_ENDPOINTS.SIGNUP,
  API_ENDPOINTS.LOGOUT,
  API_ENDPOINTS.FORGOT_PASSWORD,
  API_ENDPOINTS.REFRESH,
]);

// Type guard
function isAxiosError(error: unknown): error is import('axios').AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

function isAxiosRequestConfig(
  config: unknown
): config is import('axios').InternalAxiosRequestConfig<any> {
  return typeof config === 'object' && config !== null && 'headers' in config;
}

function getRequestPath(url: unknown): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  try {
    return new URL(url).pathname;
  } catch {
    try {
      return new URL(url, 'http://same-origin.invalid').pathname;
    } catch {
      const path = url.split(/[?#]/, 1)[0];
      return path.startsWith('/') ? path : `/${path}`;
    }
  }
}

function isPublicAuthEndpoint(url: unknown): boolean {
  const path = getRequestPath(url);
  return path !== null && PUBLIC_AUTH_ENDPOINTS.has(path);
}

function clearTokenAndRefreshAttempts() {
  refreshAttempts = 0;
  removeToken();
}

// Refresh handling after a 401 error
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      console.error('未知のエラー:', getErrorSummary(error));
      return Promise.reject(error);
    }

    // On a network error, remove the token and stop retrying when the server is unreachable
    if (error.code === 'ERR_NETWORK') {
      console.error('[apiClient] ネットワークエラー発生。トークンを削除して終了');
      clearTokenAndRefreshAttempts();
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (
      isAxiosRequestConfig(originalRequest) &&
      error.response?.status === 401
    ) {
      if (isPublicAuthEndpoint(originalRequest.url) || originalRequest.headers._retry) {
        return Promise.reject(error);
      }

      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.error(`[apiClient] リフレッシュ再試行が ${MAX_REFRESH_ATTEMPTS} 回を超えました。トークン削除`);
        clearTokenAndRefreshAttempts();
        return Promise.reject(error);
      }

      originalRequest.headers._retry = true;
      refreshAttempts++;

      try {
        // Call the refresh API with an empty request body
        const { data } = await apiClient.post(API_ENDPOINTS.REFRESH, {});
        const newAccessToken = data.access_token;
        setToken(newAccessToken);
        refreshAttempts = 0;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (isAxiosError(refreshError)) {
          console.error('[apiClient] トークンリフレッシュ失敗:', getErrorSummary(refreshError));
        }
        clearTokenAndRefreshAttempts();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Authenticated request with a token
export const apiRequestWithAuth = async <TResponse, TData = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete',
  data?: TData
): Promise<TResponse> => {
  const token = getToken();
  if (!token) {
    throw new Error('アクセストークンが見つかりません');
  }

  try {
    const response = await apiClient.request<TResponse>({
      url,
      method,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('APIリクエストに失敗しました:', getErrorSummary(error));
    } else {
      console.error('未知のエラー:', getErrorSummary(error));
    }
    throw error;
  }
};

// Unauthenticated request for login and similar flows
export const apiRequest = async <TResponse, TData = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete',
  data?: TData
): Promise<TResponse> => {
  try {
    const response = await apiClient.request<TResponse>({
      url,
      method,
      data,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      console.error('APIリクエストに失敗しました:', getErrorSummary(error));
    } else {
      console.error('未知のエラー:', getErrorSummary(error));
    }
    throw error;
  }
};

export default apiClient;
