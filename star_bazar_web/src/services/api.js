import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_URL || "http://127.0.0.1:8000/api/",
});
export const testConnection = () => API.get("test/");