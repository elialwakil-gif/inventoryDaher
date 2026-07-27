export type CurrencyCode = "USD" | "SYP";
export type PaymentStatus = "cash" | "part" | "debt";
export type DiscountType = "none" | "amount" | "percent" | "mixed";

export const toMoneyNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

export const roundMoney = (value: number, precision = 3) => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const normalizeCurrency = (value: unknown): CurrencyCode =>
  ["SYP", "SYR"].includes(String(value || "USD").trim().toUpperCase())
    ? "SYP"
    : "USD";

export const normalizeExchangeRate = (
  currency: CurrencyCode,
  exchangeRate: unknown,
) => {
  if (currency === "USD") return 1;
  return toMoneyNumber(exchangeRate);
};

export const usdToOriginal = (
  amountUSD: number,
  currency: CurrencyCode,
  exchangeRate: number,
) => (currency === "SYP" ? roundMoney(amountUSD * exchangeRate) : roundMoney(amountUSD));

export const originalToUSD = (
  amountOriginal: number,
  currency: CurrencyCode,
  exchangeRate: number,
) => (currency === "SYP" ? roundMoney(amountOriginal / exchangeRate) : roundMoney(amountOriginal));

export const usdToSYPForPaymentCurrency = (
  amountUSD: number,
  currency: CurrencyCode,
  exchangeRate: number,
) => (currency === "SYP" ? usdToOriginal(amountUSD, currency, exchangeRate) : 0);

const hasSubmittedValue = (value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const deriveDiscountType = (
  discountAmountUSD: number,
  discountPercent: number,
): DiscountType => {
  if (discountAmountUSD > 0 && discountPercent > 0) return "mixed";
  if (discountPercent > 0) return "percent";
  if (discountAmountUSD > 0) return "amount";
  return "none";
};

export const buildInvoiceMoney = ({
  totalUSD,
  subtotalUSD,
  paymentStatus,
  currency,
  exchangeRate,
  partValue,
  discountUSD = 0,
  discountAmountUSD,
  discountPercent,
}: {
  totalUSD?: number;
  subtotalUSD?: unknown;
  paymentStatus: PaymentStatus;
  currency: unknown;
  exchangeRate: unknown;
  partValue?: unknown;
  discountUSD?: unknown;
  discountAmountUSD?: unknown;
  discountPercent?: unknown;
}) => {
  const paymentCurrency = normalizeCurrency(currency);
  const rate = normalizeExchangeRate(paymentCurrency, exchangeRate);
  const hasSubtotal = hasSubmittedValue(subtotalUSD);
  const hasStructuredDiscount =
    hasSubmittedValue(discountAmountUSD) || hasSubmittedValue(discountPercent);
  const safeLegacyDiscountUSD = roundMoney(Math.max(toMoneyNumber(discountUSD), 0));
  const safeSubtotalUSD = hasSubtotal
    ? roundMoney(Math.max(toMoneyNumber(subtotalUSD), 0))
    : roundMoney(Math.max(toMoneyNumber(totalUSD), 0) + safeLegacyDiscountUSD);
  const safeDiscountPercent = roundMoney(Math.max(toMoneyNumber(discountPercent), 0));
  const safeDiscountAmountUSD = roundMoney(
    Math.max(
      hasStructuredDiscount
        ? toMoneyNumber(discountAmountUSD)
        : safeLegacyDiscountUSD,
      0,
    ),
  );
  const discountPercentUSD = roundMoney(
    safeSubtotalUSD * (safeDiscountPercent / 100),
  );
  const safeDiscountUSD = roundMoney(discountPercentUSD + safeDiscountAmountUSD);
  const safeTotalUSD = hasSubtotal || hasStructuredDiscount
    ? roundMoney(Math.max(safeSubtotalUSD - safeDiscountUSD, 0))
    : roundMoney(Math.max(toMoneyNumber(totalUSD), 0));
  const paidUSD =
    paymentStatus === "cash"
      ? safeTotalUSD
      : paymentStatus === "part"
        ? Math.min(
            safeTotalUSD,
            Math.max(originalToUSD(toMoneyNumber(partValue), paymentCurrency, rate), 0),
          )
        : 0;
  const roundedPaidUSD = roundMoney(paidUSD);
  const remainingUSD = roundMoney(Math.max(safeTotalUSD - roundedPaidUSD, 0));

  return {
    priceCurrency: "USD" as const,
    paymentCurrency,
    exchangeRate: rate,
    subtotalUSD: safeSubtotalUSD,
    totalUSD: safeTotalUSD,
    totalSYP: usdToSYPForPaymentCurrency(safeTotalUSD, paymentCurrency, rate),
    totalOriginal: usdToOriginal(safeTotalUSD, paymentCurrency, rate),
    paidUSD: roundedPaidUSD,
    paidSYP: usdToSYPForPaymentCurrency(roundedPaidUSD, paymentCurrency, rate),
    paidOriginal: usdToOriginal(roundedPaidUSD, paymentCurrency, rate),
    remainingUSD,
    remainingSYP: usdToSYPForPaymentCurrency(remainingUSD, paymentCurrency, rate),
    remainingOriginal: usdToOriginal(remainingUSD, paymentCurrency, rate),
    discountType: deriveDiscountType(safeDiscountAmountUSD, safeDiscountPercent),
    discountPercent: safeDiscountPercent,
    discountPercentUSD,
    discountAmountUSD: safeDiscountAmountUSD,
    discountUSD: safeDiscountUSD,
    discountSYP: usdToSYPForPaymentCurrency(safeDiscountUSD, paymentCurrency, rate),
    discountOriginal: usdToOriginal(safeDiscountUSD, paymentCurrency, rate),
  };
};

export const formatMoney = (value: unknown, currency: CurrencyCode | string) => {
  const amount = toMoneyNumber(value);
  return `${amount.toLocaleString(undefined, {
    maximumFractionDigits: currency === "SYP" ? 0 : 3,
  })} ${currency}`;
};

type CurrencyRecord = {
  currency?: unknown;
  paymentCurrency?: unknown;
};

export const getRecordCurrency = (record: CurrencyRecord | unknown): CurrencyCode => {
  if (record && typeof record === "object") {
    const source = record as CurrencyRecord;
    return normalizeCurrency(source.paymentCurrency || source.currency);
  }

  return normalizeCurrency(record);
};

export const shouldShowExchangeRate = (record: CurrencyRecord | unknown) =>
  getRecordCurrency(record) === "SYP";

export const formatExchangeRate = (exchangeRate: unknown) => {
  const rate = toMoneyNumber(exchangeRate);

  if (rate <= 0) return "غير محفوظ";

  return `1 USD = ${rate.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} SYP`;
};
