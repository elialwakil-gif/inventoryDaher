import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
};

const customServer = "https://company-api.example.test";
const user = { id: "manager", username: "manager", role: "admin", permissions: ["customers"] };
const makeToken = (expires = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, identifier = "manager") => {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ userId: identifier, exp: expires })}.test-signature`;
};

const unauthorized = (config: InternalAxiosRequestConfig) => new AxiosError<{ message?: string; error?: string }>(
  "Request failed with status code 401",
  "ERR_BAD_REQUEST",
  config,
  undefined,
  { data: { message: "يلزم تسجيل الدخول لإضافة الدفعة" }, status: 401, statusText: "Unauthorized", headers: {}, config },
);

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("sessionStorage", makeStorage());
  vi.stubGlobal("window", { location: { hash: "#/customerDetails", pathname: "/" } });
  vi.stubEnv("VITE_API_BASE_URL", "https://default-api.example.test");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("authenticated session storage", () => {
  it("accepts a seven day token but rejects missing, malformed, and expired tokens", async () => {
    const { isUsableAuthToken } = await import("./authSession");
    const now = Date.now();
    expect(isUsableAuthToken(makeToken(), now)).toBe(true);
    for (const candidate of [undefined, null, "", "not-a-jwt", "part.part", "header.%%%.signature", makeToken(Math.floor(now / 1000)), makeToken(Math.floor(now / 1000) - 1)]) {
      expect(isUsableAuthToken(candidate, now)).toBe(false);
    }
  });

  it("does not authenticate a legacy stored user without a usable token", async () => {
    const { getAuthenticatedUser } = await import("./authSession");
    localStorage.setItem("InventoryUser", JSON.stringify(user));
    expect(getAuthenticatedUser()).toBeNull();
    localStorage.setItem("auth_token", makeToken(Math.floor(Date.now() / 1000) - 60));
    expect(getAuthenticatedUser()).toBeNull();
    localStorage.setItem("auth_token", makeToken());
    expect(getAuthenticatedUser()).toMatchObject(user);
  });

  it("rejects invalid login responses before saving an authenticated session", async () => {
    const { normalizeLoginResponse } = await import("./authSession");
    for (const token of [undefined, "", "opaque-token", makeToken(Math.floor(Date.now() / 1000) - 1)]) {
      expect(() => normalizeLoginResponse({ user, token }, customServer)).toThrow();
    }
    for (const invalidUser of [undefined, null, {}, { ...user, role: "" }]) {
      expect(() => normalizeLoginResponse({ user: invalidUser, token: makeToken() }, customServer)).toThrow();
    }
    expect(localStorage.getItem("InventoryUser")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("binds the session to the server that actually issued the token", async () => {
    const { normalizeLoginResponse, saveAuthenticatedSession, getAuthenticatedUser, getRememberedAPIServerURL, AUTH_SERVER_URL_KEY } = await import("./authSession");
    const token = makeToken();
    const response = normalizeLoginResponse({ token, user: { ...user, serverURL: "https://different-api.example.test" } }, customServer);
    saveAuthenticatedSession(response);
    expect(getAuthenticatedUser()).toMatchObject({ ...user, serverURL: customServer });
    expect(localStorage.getItem("auth_token")).toBe(token);
    expect(localStorage.getItem(AUTH_SERVER_URL_KEY)).toBe(customServer);
    expect(getRememberedAPIServerURL()).toBe(customServer);
  });

  it("preserves the API target and uncertain cash request identifiers when signing out", async () => {
    const { clearAuthSession, getRememberedAPIServerURL } = await import("./authSession");
    localStorage.setItem("InventoryUser", JSON.stringify({ ...user, serverURL: customServer }));
    localStorage.setItem("auth_token", makeToken());
    localStorage.setItem("unrelated-setting", "keep");
    sessionStorage.setItem("inventory-pending-cash-payments", '{"payment":"cash-request"}');
    clearAuthSession();
    expect(localStorage.getItem("InventoryUser")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(getRememberedAPIServerURL()).toBe(customServer);
    expect(localStorage.getItem("unrelated-setting")).toBe("keep");
    expect(sessionStorage.getItem("inventory-pending-cash-payments")).toBe('{"payment":"cash-request"}');
  });

  it("handles damaged user storage while keeping a remembered server available", async () => {
    const { AUTH_SERVER_URL_KEY, readStoredUser, getAuthenticatedUser, getRememberedAPIServerURL } = await import("./authSession");
    localStorage.setItem(AUTH_SERVER_URL_KEY, customServer);
    localStorage.setItem("InventoryUser", "{bad json");
    localStorage.setItem("auth_token", makeToken());
    expect(readStoredUser()).toBeNull();
    expect(getAuthenticatedUser()).toBeNull();
    expect(getRememberedAPIServerURL()).toBe(customServer);
  });
});

describe("login and cash requests through the actual Axios interceptors", () => {
  it("keeps login and the first cash payment on the same server with fresh authorization", async () => {
    localStorage.setItem("InventoryUser", JSON.stringify({ ...user, serverURL: customServer }));
    localStorage.setItem("auth_token", makeToken(Math.floor(Date.now() / 1000) - 60));
    const { apiClient, getBaseURL } = await import("./axios");
    const token = makeToken();
    const requests: InternalAxiosRequestConfig[] = [];
    apiClient.defaults.adapter = async (config) => {
      requests.push(config);
      return { data: config.url === "/api/auth/login" ? { user, token } : { payment: { id: "saved" } }, status: 200, statusText: "OK", headers: {}, config };
    };
    const { default: userLogin } = await import("@/services/auth");
    const { saveAuthenticatedSession } = await import("./authSession");
    const login = await userLogin({ username: "manager", password: "test-only" });
    saveAuthenticatedSession(login);
    const { payCustomerDebt } = await import("@/services/transaction");
    await payCustomerDebt({ customerId: "customer", paymentAccountId: "cash", receivableAccountId: "receivable", amount: 0.045, amountOriginal: 450, amount_base: 450, currency: "SYP", exchangeRate: 10_000, note: "test" });

    expect(requests).toHaveLength(2);
    expect(requests.map((request) => request.baseURL)).toEqual([customServer, customServer]);
    expect(requests[0].headers.get("Authorization")).toBeUndefined();
    expect(getBaseURL()).toBe(customServer);
    expect(login.user.serverURL).toBe(customServer);
    expect(requests[1].url).toBe("/api/transactions/customerPayment");
    expect(requests[1].headers.get("Authorization")).toBe(`Bearer ${token}`);
    const paymentData = JSON.parse(requests[1].data).paymentData;
    expect(paymentData).toMatchObject({ amountUSD: 0.045, amountOriginal: 450, currency: "SYP", type: "income" });
    expect(paymentData.requestId).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });

  it("logs in against the remembered custom server after logout", async () => {
    const { saveAuthenticatedSession, clearAuthSession } = await import("./authSession");
    saveAuthenticatedSession({ user: { ...user, serverURL: customServer }, token: makeToken() });
    clearAuthSession();
    const { apiClient } = await import("./axios");
    const token = makeToken();
    let requestServer: string | undefined;
    apiClient.defaults.adapter = async (config) => {
      requestServer = config.baseURL;
      return { data: { user, token }, status: 200, statusText: "OK", headers: {}, config };
    };
    const { default: userLogin } = await import("@/services/auth");
    const result = await userLogin({ username: "manager", password: "test-only" });
    expect(requestServer).toBe(customServer);
    expect(result.user.serverURL).toBe(customServer);
  });

  it("does not accept a successful HTTP login response that omits its token", async () => {
    const { apiClient } = await import("./axios");
    apiClient.defaults.adapter = async (config) => ({ data: { user }, status: 200, statusText: "OK", headers: {}, config });
    const { default: userLogin } = await import("@/services/auth");
    await expect(userLogin({ username: "manager", password: "test-only" })).rejects.toThrow();
    expect(localStorage.getItem("InventoryUser")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("clears a rejected current session and preserves its server on a protected 401", async () => {
    const { saveAuthenticatedSession, getRememberedAPIServerURL } = await import("./authSession");
    saveAuthenticatedSession({ user: { ...user, serverURL: customServer }, token: makeToken() });
    const { apiClient } = await import("./axios");
    apiClient.defaults.adapter = async (config) => { throw unauthorized(config); };
    await expect(apiClient.post("/api/transactions/customerPayment", {})).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem("InventoryUser")).toBeNull();
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(getRememberedAPIServerURL()).toBe(customServer);
    expect(window.location.hash).toBe("#/login");
  });

  it("does not let a delayed 401 for an older token clear a newly signed in session", async () => {
    const { saveAuthenticatedSession } = await import("./authSession");
    const oldToken = makeToken(undefined, "old-user");
    saveAuthenticatedSession({ user: { ...user, serverURL: customServer }, token: oldToken });
    const { apiClient } = await import("./axios");
    let rejectRequest: (reason: unknown) => void;
    let markStarted: (config: InternalAxiosRequestConfig) => void;
    const started = new Promise<InternalAxiosRequestConfig>((resolve) => { markStarted = resolve; });
    apiClient.defaults.adapter = (config) => {
      markStarted(config);
      return new Promise((_resolve, reject) => { rejectRequest = reject; });
    };
    const pending = apiClient.get("/api/customers");
    const failedConfig = await started;
    expect(failedConfig.headers.get("Authorization")).toBe(`Bearer ${oldToken}`);
    const newToken = makeToken(undefined, "new-user");
    saveAuthenticatedSession({ user: { ...user, serverURL: customServer }, token: newToken });
    rejectRequest(unauthorized(failedConfig));
    await expect(pending).rejects.toBeInstanceOf(AxiosError);
    expect(localStorage.getItem("auth_token")).toBe(newToken);
    expect(JSON.parse(localStorage.getItem("InventoryUser")!)).toMatchObject(user);
    expect(window.location.hash).toBe("#/customerDetails");
  });

  it("shows wrong login credentials without redirecting or clearing an unrelated session", async () => {
    const { saveAuthenticatedSession } = await import("./authSession");
    const token = makeToken();
    saveAuthenticatedSession({ user: { ...user, serverURL: customServer }, token });
    const { apiClient } = await import("./axios");
    apiClient.defaults.adapter = async (config) => {
      const error = unauthorized(config);
      error.response!.data = { error: "كلمة المرور غير صحيحة" };
      throw error;
    };
    const { default: userLogin } = await import("@/services/auth");
    await expect(userLogin({ username: "manager", password: "wrong" })).rejects.toThrow("كلمة المرور غير صحيحة");
    expect(localStorage.getItem("auth_token")).toBe(token);
    expect(window.location.hash).toBe("#/customerDetails");
  });
});
