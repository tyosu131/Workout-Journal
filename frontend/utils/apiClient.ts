// utils/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 認証トークン付きのリクエストを作成するヘルパー関数
export const apiRequestWithAuth = async (url: string, method: 'get' | 'post' | 'put' | 'delete', data?: any) => {
  const token = localStorage.getItem('token');
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await apiClient.request({
      url,
      method,
      data,
      headers,
    });
    return response.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};
