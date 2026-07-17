import axios from "axios";

const BASE_URL = import.meta.env.VITE_LOCAL;
const basicAxios = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json; charset=utf-8'" },
  withCredentials: true,
});

export default basicAxios;
