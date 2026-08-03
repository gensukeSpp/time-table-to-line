import axios from "axios";

// 開発時も VITE_LOCAL を使う（CORS は backend 側で localhost:5173 を許可済み）。
// Vite proxy 経由だと Cookie / 302 の扱いが変わり、inquiry が HTML ログインページに
// フォールスルーして staff_id が取れなくなることがある。
const BASE_URL = import.meta.env.VITE_LOCAL;
const basicAxios = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json; charset=utf-8" },
  withCredentials: true,
});

export const postHeaders = async (postToken: string) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Authorization': `Bearer ${postToken}`,
    'credentials': 'include' // ここを追加。
  };
  return headers;
};

export default basicAxios;
