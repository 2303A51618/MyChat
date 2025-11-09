import axios from "axios";

// Build the API base URL:
// - If VITE_API_URL is set at build time (Netlify), use that (e.g. https://api.example.com)
// - In development, use localhost:5001
// - Otherwise fall back to relative '/api' (useful when backend serves frontend from same origin)
const viteUrl = import.meta.env.VITE_API_URL;
const API_BASE = viteUrl
  ? `${viteUrl.replace(/\/$/, "")}/api`
  : (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api");

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});