import type { QueryClient } from "@tanstack/react-query";
import { normalizeCurrency, roundMoney } from "./money";
export const cashPaymentAmountAmount = (amount: number, currency = "SYP") => {
  normalizeCurrency(currency);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e12 ||
    roundMoney(amount) <= 0
  )
    throw new Error("أدخل مبلغ دفعة صالحاً بالليرة السورية");
  return roundMoney(amount);
};
export const buildCashPaymentMoney = (input: { amount: number; currency?: string }) => {
  const amount =
    Math.sign(input.amount) *
    cashPaymentAmountAmount(Math.abs(input.amount), input.currency);
  return {
    amount,
    currency: "SYP" as const,
    type: amount > 0 ? ("income" as const) : ("expense" as const),
  };
};
export const cashPaymentErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "تعذر تسجيل الدفعة";
export const invalidateCashPaymentQueries = (queryClient: QueryClient) => {
  for (const key of [
    "customer-details",
    "supplier-details",
    "customers-table",
    "suppliers-table",
    "accounts-table",
    "journal-entries",
    "financial-operations",
    "sells-table",
    "purchases-table",
    "driver-statements",
    "driver-collection-invoices",
    "payments",
    "get-payments-table",
    "customers-summary",
  ])
    void queryClient.invalidateQueries({ queryKey: [key] });
};
