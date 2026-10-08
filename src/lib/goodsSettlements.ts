import type { Payment } from "@/services/payments";
import { originalToUSD, roundMoney, toMoneyNumber } from "./money";

export const goodsBalanceLabel = (
  balance: number,
  partyType: "customer" | "supplier",
) => {
  if (Math.abs(balance) < 0.0005) return "الحساب مسدد";
  if (partyType === "customer") return balance > 0 ? "له علينا" : "عليه لنا";
  return balance > 0 ? "علينا للمورد" : "لنا عند المورد";
};

export const goodsSettlementPreview = ({
  items,
  direction,
  currency,
  exchangeRate,
  balanceUSD,
  balanceSYP,
  balanceRateSYP,
}: {
  items: Array<{ quantity: number; settlementPrice: number; payPrice: number }>;
  direction: "receive" | "deliver";
  currency: "USD" | "SYP";
  exchangeRate: number;
  balanceUSD: number;
  balanceSYP: number;
  balanceRateSYP?: number;
}) => {
  const validRate =
    currency === "USD" || (Number.isFinite(exchangeRate) && exchangeRate > 0);
  const totalOriginal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        roundMoney(
          roundMoney(item.quantity) * roundMoney(item.settlementPrice),
        ),
      0,
    ),
  );
  const totalUSD = validRate
    ? roundMoney(
        items.reduce(
          (sum, item) =>
            sum +
            originalToUSD(
              roundMoney(
                roundMoney(item.quantity) * roundMoney(item.settlementPrice),
              ),
              currency,
              exchangeRate,
            ),
          0,
        ),
      )
    : 0;
  const costUSD =
    direction === "receive"
      ? totalUSD
      : roundMoney(
          items.reduce(
            (sum, item) =>
              sum + roundMoney(roundMoney(item.quantity) * item.payPrice),
            0,
          ),
        );
  const differenceUSD = roundMoney(totalUSD - costUSD);
  const sign = direction === "receive" ? 1 : -1;
  const nextUSD = roundMoney(balanceUSD + sign * totalUSD);
  const sypChange = !validRate
    ? 0
    : balanceRateSYP !== undefined
      ? roundMoney(totalUSD * balanceRateSYP)
      : currency === "SYP"
        ? totalOriginal
        : 0;
  const nextSYP = roundMoney(balanceSYP + sign * sypChange);
  return {
    totalOriginal,
    totalUSD,
    costUSD,
    differenceUSD,
    nextUSD,
    nextSYP,
    validRate,
  };
};

export const goodsPaymentLabel = (
  payment: Pick<Payment, "goodsDirection" | "reversalOf" | "status">,
) =>
  `${payment.reversalOf ? "سند عكس تسوية" : "تسوية بالبضاعة"} · ${payment.goodsDirection === "receive" ? "استلام" : "تسليم"}${payment.status === "reversed" ? " · ملغاة بسند عكسي" : ""}`;

export const goodsPaymentDetails = (
  payment: Pick<
    Payment,
    "goodsItems" | "warehouse" | "currency" | "paymentCurrency"
  >,
) =>
  (payment.goodsItems || [])
    .map(
      (item) =>
        `${item.name || item.code} (${toMoneyNumber(item.quantity)} × ${toMoneyNumber(item.settlementPrice)} ${payment.paymentCurrency || payment.currency})`,
    )
    .join("، ") + (payment.warehouse ? ` · ${payment.warehouse}` : "");
