import { api } from "./apiClient";

export const authService = {
  async login(login, password) {
    const response = await api.post("/auth.php?action=login", {
      login,
      password,
    });
    return response.data;
  },

  async register(login, email, password) {
    const response = await api.post("/auth.php?action=register", {
      login,
      email,
      password,
    });
    return response.data;
  },

  async logout() {
    const response = await api.post("/auth.php?action=logout", {});
    return response.data;
  },

  async checkAuth() {
    const response = await api.get("/auth.php");
    return response.data;
  },
};
