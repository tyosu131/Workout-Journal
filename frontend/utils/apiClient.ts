// apiClient.ts
import axios, { AxiosRequestHeaders } from 'axios';
import supabase from '../../backend/supabaseClient';
import { getToken } from './tokenUtils';

export const apiRequestWithAuth = async <TResponse, TData = any>(
  url: string,
  method: 'get' | 'post' | 'put' | 'delete',
  data?: TData,
  additionalHeaders?: AxiosRequestHeaders
): Promise<TResponse> => {
  // SupabaseのセッションやlocalStorageからトークンを取得
  const token = getToken();
  if (!token) {
    throw new Error('アクセストークンが見つかりません');
  }

  try {
    const response = await axios({
      url,
      method,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        ...additionalHeaders,
      },
    });

    return response.data as TResponse;
  } catch (error) {
    console.error('APIリクエストに失敗しました:', error);
    throw error;
  }
};
