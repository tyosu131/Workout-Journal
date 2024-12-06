import axios from 'axios';
import { getToken, setToken, removeToken } from '../utils/tokenUtils';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // クッキーを含めたリクエスト送信
});

// レスポンスインターセプターで401エラー時にリフレッシュ処理
apiClient.interceptors.response.use(
  (response) => response, // 成功時はそのまま返す
  async (error) => {
    const originalRequest = error.config;

    // 401エラーかつ再試行ではない場合
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 再試行フラグを設定

      try {
        // リフレッシュエンドポイントを呼び出し
        const { data } = await apiClient.post('/api/auth/refresh');
        const newAccessToken = data.access_token;

        // 新しいトークンを保存
        setToken(newAccessToken);

        // 元のリクエストに新しいトークンを付与して再試行
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('[apiClient] Token refresh failed:', refreshError);

        // リフレッシュ失敗時はトークンを削除して再認証を促す
        removeToken();
        return Promise.reject(refreshError);
      }
    }

    // 他のエラーはそのまま返す
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
