import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCashPaymentMoney, cashPaymentAmountUSD } from "./cashPayment";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { post } }));

describe("cash payment currency conversion", () => {
  it("keeps small SYP payments at the accounting precision", () => {
    expect(cashPaymentAmountUSD(450, "SYP", 10_000)).toBe(0.045);
    expect(cashPaymentAmountUSD(10_050, "SYP", 10_000)).toBe(1.005);
  });

  it("rounds the tender before conversion consistently with the server", () => {
    expect(cashPaymentAmountUSD(1.23449, "SYP", 0.01)).toBe(123.4);
  });

  it("forces USD rate1 when an old SYP rate remains in state", () => {
    expect(buildCashPaymentMoney({ amount: 12.75, amountOriginal: 12.75, currency: "USD", exchangeRate: 15_000 })).toMatchObject({
      amountUSD: 12.75, amountOriginal: 12.75, exchangeRate: 1, amountSYP: 0,
    });
  });

  it.each([1, -1])("uses signed direction %s independently of original magnitude", (sign) => {
    const result = buildCashPaymentMoney({ amount: sign * 999, amountOriginal: 450, currency: "SYP", exchangeRate: 10_000 });
    expect(result.amountUSD).toBe(sign * 0.045);
    expect(result.amountOriginal).toBe(sign * 450);
    expect(result.type).toBe(sign > 0 ? "income" : "expense");
  });

  it("supports historical SYR currency consistently", () => {
    expect(buildCashPaymentMoney({ amount: -2, amountOriginal: -20_000, currency: "SYR", exchangeRate: 10_000 })).toMatchObject({
      amountUSD: -2, amountOriginal: -20_000, currency: "SYP", paymentCurrency: "SYP",
    });
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid original amount %s", (amount) => {
    expect(() => cashPaymentAmountUSD(amount, "USD", 1)).toThrow();
  });

  it.each([0, -1, NaN, Infinity, 1_000_000_001])("rejects invalid SYP rate %s", (rate) => {
    expect(() => cashPaymentAmountUSD(450, "SYP", rate)).toThrow();
  });

  it("requires currency and refuses a value rounded to zero", () => {
    expect(() => cashPaymentAmountUSD(450, "", 1)).toThrow(/عملة/);
    expect(() => cashPaymentAmountUSD(1, "SYP", 10_000)).toThrow(/دقة/);
  });
});

describe("cash payment service contract", () => {
  beforeEach(() => {
    vi.resetModules();
    post.mockReset();
    post.mockResolvedValue({ data: { payment: { id: "saved" } } });
  });
  afterEach(() => vi.unstubAllGlobals());

  const base = { amount: 5, amountOriginal: 50_000, amount_base: 50_000, currency: "SYP", exchangeRate: 10_000, note: "تسديد", paymentAccountId: "cash" };

  it.each([
    ["customer", "in", 1], ["customer", "out", -1],
    ["supplier", "in", 1], ["supplier", "out", -1],
  ])("sends %s %s with matching amount and ledger type", async (party, _direction, sign) => {
    const { payCustomerDebt, paySupplierDebt } = await import("@/services/transaction");
    if (party === "customer") await payCustomerDebt({ ...base, amount: sign * 5, customerId: "c", receivableAccountId: "ar" });
    else await paySupplierDebt({ ...base, amount: sign * 5, supplierId: "s", payableAccountId: "ap" });
    expect(post).toHaveBeenCalledTimes(1);
    const [url, { paymentData }] = post.mock.calls[0];
    expect(url).toBe(`/api/transactions/${party}Payment`);
    expect(paymentData).toMatchObject({ amountUSD: sign * 5, amount: sign * 5, amountOriginal: sign * 50_000, amountSYP: sign * 50_000, exchangeRate: 10_000, type: sign > 0 ? "income" : "expense" });
    expect(paymentData.requestId).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });

  it("rejects wrong invoice direction and missing accounts before HTTP", async () => {
    const { payCustomerDebt, paySupplierDebt } = await import("@/services/transaction");
    await expect(payCustomerDebt({ ...base, amount: -5, customerId: "c", sellId: "invoice", receivableAccountId: "ar" })).rejects.toThrow(/من الزبون/);
    await expect(paySupplierDebt({ ...base, supplierId: "s", purchaseId: "invoice", payableAccountId: "ap" })).rejects.toThrow(/للمورد/);
    await expect(payCustomerDebt({ ...base, customerId: "c", receivableAccountId: "" })).rejects.toThrow(/حسابي/);
    expect(post).not.toHaveBeenCalled();
  });

  it("reuses the request after uncertain failure, then creates a new payment after success", async () => {
    const { payCustomerDebt } = await import("@/services/transaction");
    const payload = { ...base, customerId: "c", receivableAccountId: "ar", note: "retry" };
    post.mockRejectedValueOnce(new Error("connection lost"));
    await expect(payCustomerDebt(payload)).rejects.toThrow(/لن تُكرر/);
    await payCustomerDebt(payload);
    const firstId = post.mock.calls[0][1].paymentData.requestId;
    expect(post.mock.calls[1][1].paymentData.requestId).toBe(firstId);
    await payCustomerDebt(payload);
    expect(post.mock.calls[2][1].paymentData.requestId).not.toBe(firstId);
  });

  it("shows the server rejection and releases a definitively rejected request", async () => {
    const { paySupplierDebt } = await import("@/services/transaction");
    const payload = { ...base, amount: -5, supplierId: "s", payableAccountId: "ap", note: "reject" };
    post.mockRejectedValueOnce({ response: { status: 400, data: { message: "المبلغ أكبر من المتبقي" } } });
    await expect(paySupplierDebt(payload)).rejects.toThrow("المبلغ أكبر من المتبقي");
    await paySupplierDebt(payload);
    expect(post.mock.calls[1][1].paymentData.requestId).not.toBe(post.mock.calls[0][1].paymentData.requestId);
  });

  it("restores an uncertain request identifier after a page reload", async () => {
    const stored = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const payload = { ...base, customerId: "c", receivableAccountId: "ar", note: "reload" };
    const beforeReload = await import("@/services/transaction");
    post.mockRejectedValueOnce(new Error("connection lost"));
    await expect(beforeReload.payCustomerDebt(payload)).rejects.toThrow();
    const firstId = post.mock.calls[0][1].paymentData.requestId;
    vi.resetModules();
    const afterReload = await import("@/services/transaction");
    await afterReload.payCustomerDebt(payload);
    expect(post.mock.calls[1][1].paymentData.requestId).toBe(firstId);
    expect(JSON.parse(stored.get("inventory-pending-cash-payments")!)).toEqual({});
  });

  it("supports HTTP local networks without crypto.randomUUID", async () => {
    vi.stubGlobal("crypto", undefined);
    const { payCustomerDebt } = await import("@/services/transaction");
    await payCustomerDebt({ ...base, customerId: "c", receivableAccountId: "ar", note: "local network" });
    expect(post.mock.calls[0][1].paymentData.requestId).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
  });
});
