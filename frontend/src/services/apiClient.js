import axios from "axios";
import { API_URL } from "../config/api";
const client = axios.create({ withCredentials: true });
const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
if (demoMode) {
  const { createDemoAdapter } = await import("../demo/adapter");
  client.defaults.adapter = createDemoAdapter();
}
let csrfRequest;
client.interceptors.request.use(async (config) => {
  if (
    !demoMode &&
    !["get", "head", "options"].includes(config.method || "get")
  ) {
    csrfRequest ||= axios
      .get(API_URL + "/?action=csrf", { withCredentials: true })
      .then(({ data }) => data.token)
      .catch((error) => {
        csrfRequest = undefined;
        throw error;
      });
    config.headers["X-CSRF-Token"] = await csrfRequest;
  }
  return config;
});
client.interceptors.response.use(
  (response) => {
    if (response.config.url.includes("action=logout")) csrfRequest = undefined;
    return response;
  },
  (error) => {
    if (error.response?.status === 419) csrfRequest = undefined;
    return Promise.reject(error);
  },
);
export default client;
