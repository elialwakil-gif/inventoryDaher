import { describe, expect, it } from "vitest";
import {
  goodsBalanceLabel,
  goodsPaymentDetails,
  goodsPaymentLabel,
  goodsSettlementPreview,
} from "./goodsSettlements";

describe("goods settlement financial preview", () => {
  it("reduces customer debt on receipt and values incoming stock at the agreed price", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 35, payPrice: 20 }],
      direction: "receive",
      currency: "USD",
      exchangeRate: 1,
      balanceUSD: -100,
      balanceSYP: 0,
    });
    expect(result.totalUSD).toBe(70);
    expect(result.costUSD).toBe(70);
    expect(result.differenceUSD).toBe(0);
    expect(result.nextUSD).toBe(-30);
    expect(goodsBalanceLabel(result.nextUSD, "customer")).toBe("عليه لنا");
  });

  it("reduces supplier payable on delivery and separates settlement value from inventory cost", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 35, payPrice: 20 }],
      direction: "deliver",
      currency: "USD",
      exchangeRate: 1,
      balanceUSD: 100,
      balanceSYP: 0,
    });
    expect(result.nextUSD).toBe(30);
    expect(result.costUSD).toBe(40);
    expect(result.differenceUSD).toBe(30);
    expect(goodsBalanceLabel(result.nextUSD, "supplier")).toBe("علينا للمورد");
  });

  it("shows customer credit and supplier debt for receipt, and customer debt and supplier credit for delivery", () => {
    expect(goodsBalanceLabel(20, "customer")).toBe("له علينا");
    expect(goodsBalanceLabel(20, "supplier")).toBe("علينا للمورد");
    expect(goodsBalanceLabel(-20, "customer")).toBe("عليه لنا");
    expect(goodsBalanceLabel(-20, "supplier")).toBe("لنا عند المورد");
    expect(goodsBalanceLabel(0, "customer")).toBe("الحساب مسدد");
  });

  it("uses settlement conversion for USD value and invoice historical conversion for balanceSYP", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 6000, payPrice: 3 }],
      direction: "receive",
      currency: "SYP",
      exchangeRate: 2000,
      balanceUSD: -20,
      balanceSYP: -30000,
      balanceRateSYP: 1500,
    });
    expect(result.totalUSD).toBe(6);
    expect(result.nextUSD).toBe(-14);
    expect(result.nextSYP).toBe(-21000);
  });

  it("keeps USD invoice original balance separate from an SYP settlement", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 6000, payPrice: 3 }],
      direction: "receive",
      currency: "SYP",
      exchangeRate: 2000,
      balanceUSD: -20,
      balanceSYP: 0,
      balanceRateSYP: 0,
    });
    expect(result.nextSYP).toBe(0);
  });

  it("matches server rounding per line and preserves the original SYP balance value", () => {
    const result = goodsSettlementPreview({
      items: [
        { quantity: 1, settlementPrice: 1, payPrice: 0 },
        { quantity: 1, settlementPrice: 1, payPrice: 0 },
      ],
      direction: "receive",
      currency: "SYP",
      exchangeRate: 3,
      balanceUSD: -1,
      balanceSYP: -3,
    });
    expect(result.totalOriginal).toBe(2);
    expect(result.totalUSD).toBe(0.666);
    expect(result.nextUSD).toBe(-0.334);
    expect(result.nextSYP).toBe(-1);
  });

  it("rejects invalid exchange rates without showing infinite preview balances", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 6000, payPrice: 3 }],
      direction: "receive",
      currency: "SYP",
      exchangeRate: 0,
      balanceUSD: -20,
      balanceSYP: 0,
    });
    expect(result.validRate).toBe(false);
    expect(result.nextUSD).toBe(-20);
    expect(result.totalUSD).toBe(0);
  });

  it("marks reversal receipts explicitly and renders immutable agreed item prices", () => {
    expect(
      goodsPaymentLabel({ goodsDirection: "deliver", reversalOf: "original" }),
    ).toContain("سند عكس تسوية");
    expect(
      goodsPaymentLabel({ goodsDirection: "receive", status: "reversed" }),
    ).toContain("ملغاة بسند عكسي");
    expect(
      goodsPaymentDetails({
        currency: "SYP",
        warehouse: "الرئيسي",
        goodsItems: [
          {
            productId: "p1",
            name: "صنف",
            code: "A",
            warehouse: "الرئيسي",
            quantity: 2,
            settlementPrice: 6000,
            settlementPriceUSD: 3,
            costUSD: 6,
            lineTotalUSD: 6,
            lineTotalOriginal: 12000,
            quantityBefore: 0,
            quantityAfter: 2,
          },
        ],
      }),
    ).toBe("صنف (2 × 6000 SYP) · الرئيسي");
  });
});
