import type { Payment } from "@/services/payments";
import { roundMoney, toMoneyNumber } from "./money";
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
  currency: _currency,
  balance: balanceAmount,
}: {
  items: Array<{
    quantity: number;
    settlementPrice: number;
    payPrice: number;
  }>;
  direction: "receive" | "deliver";
  currency: "SYP";
  balance: number;
}) => {
  const totalOriginal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum + roundMoney(roundMoney(item.quantity) * roundMoney(item.settlementPrice)),
      0,
    ),
  );
  const totalAmount = roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        roundMoney(
          roundMoney(roundMoney(item.quantity) * roundMoney(item.settlementPrice)),
        ),
      0,
    ),
  );
  const costAmount =
    direction === "receive"
      ? totalAmount
      : roundMoney(
          items.reduce(
            (sum, item) => sum + roundMoney(roundMoney(item.quantity) * item.payPrice),
            0,
          ),
        );
  const differenceAmount = roundMoney(totalAmount - costAmount);
  const sign = direction === "receive" ? 1 : -1;
  const nextAmount = roundMoney(balanceAmount + sign * totalAmount);
  const nextSYP = nextAmount;
  return {
    totalPrice: totalOriginal,
    costAmount,
    differenceAmount,
    nextAmount,
    nextSYP,
  };
};
export const goodsPaymentLabel = (
  payment: Pick<Payment, "goodsDirection" | "reversalOf" | "status">,
) =>
  `${payment.reversalOf ? "سند عكس تسوية" : "تسوية بالبضاعة"} · ${payment.goodsDirection === "receive" ? "استلام" : "تسليم"}${payment.status === "reversed" ? " · ملغاة بسند عكسي" : ""}`;
export const goodsPaymentDetails = (
  payment: Pick<Payment, "goodsItems" | "warehouse" | "currency" | "currency">,
) =>
  (payment.goodsItems || [])
    .map(
      (item) =>
        `${item.name || item.code} (${toMoneyNumber(item.quantity)} × ${toMoneyNumber(item.settlementPrice)} ${payment.currency})`,
    )
    .join("، ") + (payment.warehouse ? ` · ${payment.warehouse}` : "");
