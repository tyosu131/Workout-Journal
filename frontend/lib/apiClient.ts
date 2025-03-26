// frontend/lib/apiClient.ts
import axios from 'axios';
import { getToken, setToken, removeToken } from '../../shared/utils/tokenUtils';
import { API_ENDPOINTS } from '../../shared/constants/endpoints';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
console.log('API Base URL:', baseURL);
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL);

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- リフレッシュ再試行回数の管理 ---
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

// 型ガード
function isAxiosError(error: unknown): error is import('axios').AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

function isAxiosRequestConfig(
  config: unknown
): config is import('axios').InternalAxiosRequestConfig<any> {
  return typeof config === 'object' && config !== null && 'headers' in config;
}

// 401エラー時のリフレッシュ処理
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      console.error('未知のエラー:', error);
      return Promise.reject(error);
    }

    // ネットワークエラーの場合、サーバー接続ができなければすぐにトークン削除してリトライを中断
    if (error.code === 'ERR_NETWORK') {
      console.error('[apiClient] ネットワークエラー発生。トークンを削除して終了');
      removeToken();
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (
      isAxiosRequestConfig(originalRequest) &&
      error.response?.status === 401 &&
      !originalRequest.headers._retry
    ) {
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        console.error(`[apiClient] リフレッシュ再試行が ${MAX_REFRESH_ATTEMPTS} 回を超えました。トークン削除`);
        removeToken();
        return Promise.reject(error);
      }

      originalRequest.headers._retry = true;
      refreshAttempts++;

      try {
        // リフレッシュAPI呼び出し（bodyは空オブジェクト）
        const { data } = await apiClient.post(API_ENDPOINTS.REFRESH, {});
        const newAccessToken = data.access_token;
        console.log('[apiClient] トークンリフレッシュ成功:', newAccessToken);
        setToken(newAccessToken);
        refreshAttempts = 0; // 成功したらリトライ回数をリセット

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        if (isAxiosError(refreshError)) {
          console.error(
            '[apiClient] トークンリフレッシュ失敗:',
            refreshError.response?.data || refreshError.message
          );
        }
        removeToken();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// トークン付きリクエスト (認証済み用)
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
      console.error('APIリクエストに失敗しました:', error.response?.data || error.message);
    } else {
      console.error('未知のエラー:', error);
    }
    throw error;
  }
};

// トークンなしリクエスト (ログイン等用)
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
      console.error('APIリクエストに失敗しました:', error.response?.data || error.message);
    } else {
      console.error('未知のエラー:', error);
    }
    throw error;
  }
};

export default apiClient;
