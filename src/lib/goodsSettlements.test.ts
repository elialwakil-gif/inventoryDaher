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
      currency: "SYP",
      balance: -100,
    });
    expect(result.totalPrice).toBe(70);
    expect(result.costAmount).toBe(70);
    expect(result.differenceAmount).toBe(0);
    expect(result.nextAmount).toBe(-30);
    expect(goodsBalanceLabel(result.nextAmount, "customer")).toBe("عليه لنا");
  });
  it("reduces supplier payable on delivery and separates settlement value from inventory cost", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 35, payPrice: 20 }],
      direction: "deliver",
      currency: "SYP",
      balance: 100,
    });
    expect(result.nextAmount).toBe(30);
    expect(result.costAmount).toBe(40);
    expect(result.differenceAmount).toBe(30);
    expect(goodsBalanceLabel(result.nextAmount, "supplier")).toBe("علينا للمورد");
  });
  it("shows customer credit and supplier debt for receipt, and customer debt and supplier credit for delivery", () => {
    expect(goodsBalanceLabel(20, "customer")).toBe("له علينا");
    expect(goodsBalanceLabel(20, "supplier")).toBe("علينا للمورد");
    expect(goodsBalanceLabel(-20, "customer")).toBe("عليه لنا");
    expect(goodsBalanceLabel(-20, "supplier")).toBe("لنا عند المورد");
    expect(goodsBalanceLabel(0, "customer")).toBe("الحساب مسدد");
  });
  it("uses the agreed lira value directly for the balance and stock", () => {
    const result = goodsSettlementPreview({
      items: [{ quantity: 2, settlementPrice: 6000, payPrice: 3000 }],
      direction: "receive",
      currency: "SYP",
      balance: -20000,
    });
    expect(result.totalPrice).toBe(12000);
    expect(result.nextAmount).toBe(-8000);
    expect(result.nextSYP).toBe(-8000);
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
            settlementPriceAmount: 3,
            costAmount: 6,
            lineTotalAmount: 6,
            quantityBefore: 0,
            quantityAfter: 2,
          },
        ],
      }),
    ).toBe("صنف (2 × 6000 SYP) · الرئيسي");
  });
});
