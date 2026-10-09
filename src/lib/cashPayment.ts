import type { QueryClient } from "@tanstack/react-query";
import { originalToUSD, roundMoney, type CurrencyCode } from "./money";

const cashCurrency = (value: string): CurrencyCode => {
  if (value === "USD") return "USD";
  if (value === "SYP" || value === "SYR") return "SYP";
  throw new Error("يرجى اختيار عملة الدفعة");
};

export const cashPaymentAmountUSD = (
  amountOriginal: number,
  currencyValue: string,
  exchangeRate: number,
) => {
  const currency = cashCurrency(currencyValue);
  if (!Number.isFinite(amountOriginal) || amountOriginal <= 0) {
    throw new Error("قيمة الدفعة يجب أن تكون أكبر من صفر");
  }
  if (currency === "SYP" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 1_000_000_000)) {
    throw new Error("يرجى إدخال سعر صرف صالح أكبر من صفر");
  }
  const amountUSD = originalToUSD(roundMoney(amountOriginal), currency, currency === "USD" ? 1 : exchangeRate);
  if (!Number.isFinite(amountUSD) || amountUSD <= 0) {
    throw new Error("قيمة الدفعة أقل من دقة الحساب، يرجى مراجعة المبلغ وسعر الصرف");
  }
  return amountUSD;
};

/** amount determines cash direction; original fields carry the tender value. */
export const buildCashPaymentMoney = (input: {
  amount: number;
  amountOriginal?: number;
  amount_base?: number;
  currency: string;
  paymentCurrency?: CurrencyCode;
  exchangeRate: number;
}) => {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    throw new Error("قيمة الدفعة يجب أن تكون أكبر من صفر");
  }
  const currency = cashCurrency(input.paymentCurrency || input.currency);
  const exchangeRate = currency === "USD" ? 1 : input.exchangeRate;
  const sign = input.amount < 0 ? -1 : 1;
  const submittedOriginal = input.amountOriginal ?? input.amount_base;
  const original = submittedOriginal === undefined
    ? Math.abs(input.amount) * (currency === "SYP" ? exchangeRate : 1)
    : Math.abs(submittedOriginal);
  const amountUSD = sign * cashPaymentAmountUSD(original, currency, exchangeRate);
  const amountOriginal = sign * roundMoney(original);
  return {
    amount: amountUSD,
    amountUSD,
    amountOriginal,
    amount_base: amountOriginal,
    amountSYP: currency === "SYP" ? amountOriginal : 0,
    currency,
    paymentCurrency: currency,
    exchangeRate,
    type: sign > 0 ? "income" as const : "expense" as const,
  };
};

export const cashPaymentErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return "تعذر تسجيل الدفعة، يرجى المحاولة مجددًا";
};

export const invalidateCashPaymentQueries = (queryClient: QueryClient) => {
  for (const key of [
    "customer-details", "supplier-details", "customers-table", "suppliers-table",
    "accounts-table", "journal-entries", "financial-operations", "sells-table",
    "purchases-table", "driver-statements", "driver-collection-invoices",
    "payments", "get-payments-table", "customers-summary",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
};
