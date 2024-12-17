import axios from 'axios';
import { getToken, setToken, removeToken } from '../utils/tokenUtils';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // クッキーを含めたリクエスト送信
});

// レスポンスインターセプターで401エラー時にリフレッシュ処理
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await apiClient.post('/api/auth/refresh');
        const newAccessToken = data.access_token;

        console.log("[apiClient] トークンリフレッシュ成功:", newAccessToken);
        setToken(newAccessToken); // トークン保存

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("[apiClient] トークンリフレッシュ失敗:", refreshError);
        removeToken();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);


export const apiRequestWithAuth = async <TResponse, TData = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete',
  data?: TData
): Promise<TResponse> => {
  try {
    // 現在のトークンを取得
    const token = getToken();
    if (!token) {
      throw new Error('アクセストークンが見つかりません');
    }

    // APIリクエストを送信
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
    console.error('APIリクエストに失敗しました:', error);
    throw error;
  }
};

export default apiClient;
