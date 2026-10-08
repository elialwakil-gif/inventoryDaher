import apiClient from "@/lib/axios";
import type { Payment } from "./payments";

export interface GoodsSettlementInput {
  requestId: string;
  partyType: "customer" | "supplier";
  customerId?: string;
  supplierId?: string;
  goodsDirection: "receive" | "deliver";
  warehouse: string;
  items: Array<{
    productId: string;
    quantity: number;
    settlementPrice: number;
  }>;
  currency: "USD" | "SYP";
  exchangeRate: number;
  note: string;
  sellId?: string;
  purchaseId?: string;
  partyAccountId: string;
  inventoryAccountId: string;
  differenceAccountId?: string;
}

const serverError = (error: any, fallback: string) => {
  const result = new Error(
    error?.response?.data?.message || error?.response?.data?.error || fallback,
  ) as Error & { outcomeUncertain: boolean };
  result.outcomeUncertain = !error?.response || error.response.status >= 500;
  return result;
};

export async function createGoodsSettlement(
  paymentData: GoodsSettlementInput,
): Promise<{ payment: Payment }> {
  try {
    const response = await apiClient.post("/api/transactions/goodsPayment", {
      paymentData,
    });
    return response.data;
  } catch (error) {
    throw serverError(
      error,
      "تعذر تسجيل التسوية بالبضاعة. تحقق من الاتصال وأعد المحاولة.",
    );
  }
}

export async function reverseGoodsSettlement({
  id,
  requestId,
  note,
}: {
  id: string;
  requestId: string;
  note: string;
}): Promise<Payment> {
  try {
    const response = await apiClient.post(
      `/api/transactions/goodsPayment/${encodeURIComponent(id)}/reverse`,
      { requestId, note },
    );
    return response.data.payment;
  } catch (error) {
    throw serverError(error, "تعذر إلغاء التسوية بالبضاعة");
  }
}

export const newSettlementRequestId = () => crypto.randomUUID();
