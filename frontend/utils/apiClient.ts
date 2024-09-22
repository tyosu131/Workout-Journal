import axios, { AxiosRequestHeaders } from 'axios';
import supabase from '../../backend/supabaseClient'; // Supabaseクライアントをインポート

// ジェネリクスを使った型定義
export const apiRequestWithAuth = async <TResponse, TData = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete',
  data?: TData, // data にもジェネリクスを適用
  additionalHeaders?: AxiosRequestHeaders
): Promise<TResponse> => {
  // セッション取得のロジックを共通化
  const { data: sessionData, error } = await supabase.auth.getSession();
  if (error || !sessionData?.session) {
    throw new Error('Failed to retrieve session');
  }

  const token = sessionData.session.access_token;
  if (!token) {
    throw new Error('No access token found');
  }

  try {
    const response = await axios({
      url,
      method,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        ...additionalHeaders, // 外部から渡されたヘッダーを追加
      },
    });

    return response.data as TResponse; // ジェネリクスを使って型を推論
  } catch (error) {
    console.error('API request failed', error);
    throw error;
  }
};
