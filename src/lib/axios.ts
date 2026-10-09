import axios from "axios";
import { clearAuthSession, getRememberedAPIServerURL, readStoredUser } from "./authSession";

const encodeHeaderValue = (value: unknown) => encodeURIComponent(String(value));

/**
 * جلب رابط السيرفر من localStorage أو env
 */
export const getBaseURL = () => {
  try {
    const storedUser = localStorage.getItem("InventoryUser");
    const inventoryUser = storedUser ? JSON.parse(storedUser) : null;

    return (
      // "https://serverinventorydaherserver-b7gf.onrender.com"
      inventoryUser?.serverURL ||
      getRememberedAPIServerURL() ||
      import.meta.env.VITE_API_BASE_URL ||
      "https://serverinventorydaherserver-b7gf.onrender.com"
    );
  } catch (error) {
    console.error("Failed to parse InventoryUser:", error);
    return (
      getRememberedAPIServerURL() || import.meta.env.VITE_API_BASE_URL || "https://serverinventorydaherserver-b7gf.onrender.com"
    );
  }
};

// ✅ إنشاء axios instance
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// Request interceptor
// =========================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && !String(config.url || "").includes("/auth/login")) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    const inventoryUser = readStoredUser();
    const userId = inventoryUser?.id || inventoryUser?._id || inventoryUser?.username;

    if (userId) {
      config.headers["X-Inventory-User-Id"] = encodeHeaderValue(userId);
    }

    if (inventoryUser?.username) {
      config.headers["X-Inventory-Username"] = encodeHeaderValue(
        inventoryUser.username,
      );
    }

    // 🔥 تحديث baseURL في كل طلب (لو تغير المستخدم)
    if (inventoryUser?.role) {
      config.headers["X-Inventory-Role"] = inventoryUser.role;
    }

    if (Array.isArray(inventoryUser?.permissions)) {
      config.headers["X-Inventory-Permissions"] =
        inventoryUser.permissions.join(",");
    }

    config.baseURL = getBaseURL();

    return config;
  },
  (error) => Promise.reject(error),
);

// =========================
// Response interceptor
// =========================
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestURL = String(error.config?.url || "");
    const requestHeaders = error.config?.headers;
    const sentAuthorization = requestHeaders?.get?.("Authorization") ||
      requestHeaders?.Authorization || requestHeaders?.authorization;
    const currentToken = localStorage.getItem("auth_token");
    if (error.response?.status === 401 && !requestURL.includes("/auth/login") &&
      (!currentToken || sentAuthorization === `Bearer ${currentToken}`)) {
      clearAuthSession();
      if (typeof window !== "undefined") window.location.hash = "#/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
