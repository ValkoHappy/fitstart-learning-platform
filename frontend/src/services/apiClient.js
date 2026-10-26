import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

let csrfToken;
let sessionRequest;

api.interceptors.response.use((response) => {
  if (response.data?.csrfToken) csrfToken = response.data.csrfToken;
  return response;
});

api.interceptors.request.use(async (config) => {
  if (!["get", "head", "options"].includes(config.method || "get")) {
    if (!csrfToken) {
      sessionRequest ||= api.get("/auth.php").finally(() => {
        sessionRequest = null;
      });
      await sessionRequest;
    }
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});
