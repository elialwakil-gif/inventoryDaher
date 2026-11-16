import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCashPaymentMoney, cashPaymentAmountAmount } from "./cashPayment";
const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { post } }));
describe("Syrian lira payments", () => {
  it("preserves the entered lira amount without conversion", () => {
    expect(cashPaymentAmountAmount(450, "SYP")).toBe(450);
    expect(cashPaymentAmountAmount(10050, "SYP")).toBe(10050);
    expect(cashPaymentAmountAmount(1.23449, "SYP")).toBe(1.234);
  });
  it.each([1, -1])("preserves signed cash direction %s", (sign) => {
    expect(buildCashPaymentMoney({ amount: sign * 450, currency: "SYP" })).toEqual({
      amount: sign * 450,
      currency: "SYP",
      type: sign > 0 ? "income" : "expense",
    });
  });
  it.each([0, -1, NaN, Infinity, 1e13])("rejects an invalid amount %s", (amount) =>
    expect(() => cashPaymentAmountAmount(amount, "SYP")).toThrow(),
  );
  it("rejects another currency", () =>
    expect(() => cashPaymentAmountAmount(100, "USD")).toThrow());
});
describe("cash payment service contract", () => {
  beforeEach(() => {
    vi.resetModules();
    post.mockReset();
    post.mockResolvedValue({ data: { payment: { id: "saved" } } });
  });
  afterEach(() => vi.unstubAllGlobals());
  const base = { amount: 5, currency: "SYP", note: "تسديد", paymentAccountId: "cash" };
  it.each([
    ["customer", "in", 1],
    ["customer", "out", -1],
    ["supplier", "in", 1],
    ["supplier", "out", -1],
  ])(
    "sends %s %s with matching amount and ledger type",
    async (party, _direction, sign) => {
      const { payCustomerDebt, paySupplierDebt } =
        await import("@/services/transaction");
      if (party === "customer")
        await payCustomerDebt({
          ...base,
          amount: sign * 5,
          customerId: "c",
          receivableAccountId: "ar",
        });
      else
        await paySupplierDebt({
          ...base,
          amount: sign * 5,
          supplierId: "s",
          payableAccountId: "ap",
        });
      expect(post).toHaveBeenCalledTimes(1);
      const [url, { paymentData }] = post.mock.calls[0];
      expect(url).toBe(`/api/transactions/${party}Payment`);
      expect(paymentData).toMatchObject({
        amount: sign * 5,
        type: sign > 0 ? "income" : "expense",
      });
      expect(paymentData.requestId).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    },
  );
  it("rejects wrong invoice direction and missing accounts before HTTP", async () => {
    const { payCustomerDebt, paySupplierDebt } = await import("@/services/transaction");
    await expect(
      payCustomerDebt({
        ...base,
        amount: -5,
        customerId: "c",
        sellId: "invoice",
        receivableAccountId: "ar",
      }),
    ).rejects.toThrow(/من الزبون/);
    await expect(
      paySupplierDebt({
        ...base,
        supplierId: "s",
        purchaseId: "invoice",
        payableAccountId: "ap",
      }),
    ).rejects.toThrow(/للمورد/);
    await expect(
      payCustomerDebt({ ...base, customerId: "c", receivableAccountId: "" }),
    ).rejects.toThrow(/حسابي/);
    expect(post).not.toHaveBeenCalled();
  });
  it("reuses the request after uncertain failure, then creates a new payment after success", async () => {
    const { payCustomerDebt } = await import("@/services/transaction");
    const payload = {
      ...base,
      customerId: "c",
      receivableAccountId: "ar",
      note: "retry",
    };
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
    const payload = {
      ...base,
      amount: -5,
      supplierId: "s",
      payableAccountId: "ap",
      note: "reject",
    };
    post.mockRejectedValueOnce({
      response: { status: 400, data: { message: "المبلغ أكبر من المتبقي" } },
    });
    await expect(paySupplierDebt(payload)).rejects.toThrow("المبلغ أكبر من المتبقي");
    await paySupplierDebt(payload);
    expect(post.mock.calls[1][1].paymentData.requestId).not.toBe(
      post.mock.calls[0][1].paymentData.requestId,
    );
  });
  it("restores an uncertain request identifier after a page reload", async () => {
    const stored = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
    });
    const payload = {
      ...base,
      customerId: "c",
      receivableAccountId: "ar",
      note: "reload",
    };
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
    await payCustomerDebt({
      ...base,
      customerId: "c",
      receivableAccountId: "ar",
      note: "local network",
    });
    expect(post.mock.calls[0][1].paymentData.requestId).toMatch(
      /^[A-Za-z0-9_-]{8,128}$/,
    );
  });
});
