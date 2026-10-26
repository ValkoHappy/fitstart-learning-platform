import { api } from "./apiClient";

export const applicationService = {
  async getApplications(search = "", status = "", userId = "") {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    if (userId) params.append("user_id", userId);

    const response = await api.get(`/applications.php?${params.toString()}`);
    return response.data;
  },

  async createApplication(comment = "", courseName = "Как стать тренером") {
    const response = await api.post("/applications.php", {
      comment,
      course_name: courseName,
    });
    return response.data;
  },

  async updateApplicationStatus(applicationId, status) {
    const response = await api.patch("/applications.php", {
      id: applicationId,
      status,
    });
    return response.data;
  },
};
