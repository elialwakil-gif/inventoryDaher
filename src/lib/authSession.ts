export const AUTH_SERVER_URL_KEY = "inventory_api_server_url";

export const readStoredUser = (): Record<string, any> | null => {
  try {
    const user = JSON.parse(localStorage.getItem("InventoryUser") || "null");
    return user && typeof user === "object" && !Array.isArray(user) ? user : null;
  } catch {
    return null;
  }
};

export const getRememberedAPIServerURL = () => {
  try {
    return localStorage.getItem(AUTH_SERVER_URL_KEY) || "";
  } catch {
    return "";
  }
};

/** Local expiry checks only; the server verifies the signature and permissions. */
export const isUsableAuthToken = (token: unknown, nowMS = Date.now()) => {
  if (typeof token !== "string" || !token.trim()) return false;
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp * 1000 > nowMS;
  } catch {
    return false;
  }
};

export const getAuthenticatedUser = () => {
  try {
    const user = readStoredUser();
    if (!user?.role || !isUsableAuthToken(localStorage.getItem("auth_token"))) return null;
    return user;
  } catch {
    return null;
  }
};

export const normalizeLoginResponse = (data: any, serverURL: string) => {
  const token = data?.token || data?.accessToken || data?.user?.token;
  const user = data?.user;
  if (!user || typeof user !== "object" || Array.isArray(user) || typeof user.role !== "string" || !user.role) {
    throw new Error(data?.error || "لم يُرجع الخادم بيانات مستخدم صالحة");
  }
  if (!isUsableAuthToken(token)) {
    throw new Error("لم يُرجع الخادم رمز دخول صالحًا. يلزم تحديث خادم تسجيل الدخول.");
  }
  if (!serverURL) throw new Error("تعذر تحديد خادم تسجيل الدخول");
  return { ...data, token: token.trim(), user: { ...user, serverURL } };
};

export const saveAuthenticatedSession = (response: { user: Record<string, any>; token: string }) => {
  const validated = normalizeLoginResponse(response, response.user?.serverURL);
  localStorage.setItem(AUTH_SERVER_URL_KEY, validated.user.serverURL);
  localStorage.setItem("auth_token", validated.token);
  localStorage.setItem("InventoryUser", JSON.stringify(validated.user));
};

export const clearAuthSession = () => {
  const user = readStoredUser();
  if (typeof user?.serverURL === "string" && user.serverURL) {
    localStorage.setItem(AUTH_SERVER_URL_KEY, user.serverURL);
  }
  localStorage.removeItem("InventoryUser");
  localStorage.removeItem("auth_token");
};
