import axios from "axios";

// 開発時も VITE_LOCAL を使う（CORS は backend 側で localhost:5173 を許可済み）。
// Vite proxy 経由だと Cookie / 302 の扱いが変わり、inquiry が HTML ログインページに
// フォールスルーして staff_id が取れなくなることがある。
const BASE_URL = import.meta.env.SERVER_ON_RENDER;
const basicAxios = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json; charset=utf-8" },
});

export const postHeaders = async (postToken: string) => ({
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Authorization': `Bearer ${postToken}`,
  },
  withCredentials: true,
});

export default basicAxios;
