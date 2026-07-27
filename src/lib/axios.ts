import axios from "axios";

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
      import.meta.env.VITE_API_BASE_URL ||
      "https://serverinventorydaherserver-b7gf.onrender.com"
    );
  } catch (error) {
    console.error("Failed to parse InventoryUser:", error);
    return (
      import.meta.env.VITE_API_BASE_URL || "https://serverinventorydaherserver-b7gf.onrender.com"
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const storedUser = localStorage.getItem("InventoryUser");
    const inventoryUser = storedUser ? JSON.parse(storedUser) : null;
    const userId = inventoryUser?.id || inventoryUser?._id || inventoryUser?.username;

    if (userId) {
      config.headers["X-Inventory-User-Id"] = userId;
    }

    if (inventoryUser?.username) {
      config.headers["X-Inventory-Username"] = inventoryUser.username;
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
    return Promise.reject(error);
  },
);

export default apiClient;
