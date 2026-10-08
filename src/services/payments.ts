import apiClient from "@/lib/axios";

export interface GoodsPaymentItem {
  productId: string;
  name: string;
  code: string;
  warehouse: string;
  unit?: string;
  quantity: number;
  settlementPrice: number;
  settlementPriceUSD: number;
  costPriceUSD?: number;
  costUSD: number;
  lineTotalUSD: number;
  lineTotalOriginal: number;
  quantityBefore: number;
  quantityAfter: number;
}

export interface Payment {
  id?: string;
  type: string,
  supplierId?: string,
  customerId?: string,
  paymentAccountId?: string,
  receivableAccountId?: string,
  payableAccountId?: string,
  salesAccountId?: string,
  expenseAccountId?: string,
  currency: string,
  exchangeRate: number,
  amount_base: number,
  amount: number,
  paymentCurrency?: "USD" | "SYP",
  amountUSD?: number,
  amountSYP?: number,
  amountOriginal?: number,
  sellId?: string,
  purchaseId?: string,
  settlementMethod?: "cash" | "goods",
  goodsDirection?: "receive" | "deliver",
  goodsItems?: GoodsPaymentItem[],
  warehouse?: string,
  partyAccountId?: string,
  inventoryAccountId?: string,
  differenceAccountId?: string,
  balanceUSDChange?: number,
  balanceSYPChange?: number,
  goodsCostUSD?: number,
  goodsDifferenceUSD?: number,
  reversalOf?: string,
  reversedBy?: string,
  status?: "posted" | "reversed",
  actorId?: string,
  actorName?: string,
  driverMovementId?: string,
  date?: string,
  note: string
}


export default async function getAllPayments() {
  try {
    const response = await apiClient.get("/api/payments");
    console.log(response)
    return response.data   
  } catch (err) {
    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب الدفعات");
  }
}

export async function getPaymentsByMonth({month, year}: {month: string, year: string}) {
  try {
    const response = await apiClient.get(`/api/payments/month?month=${month}&year=${year}`);
    return response.data   
  } catch (err) {
    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب الدفعات حسب الشهر");
  }
}

export async function createPayment({ newPayment }: { newPayment: Payment }): Promise<Payment | null> {
  try {
    const response = await apiClient.post(`/api/payments/create`, { newPayment });
    console.log("تم إنشاء الدفعة:", response.data);
    return response.data as Payment;
  } catch (err) {
    console.error("خطأ أثناء إنشاء الدفعة:", err);
    throw new Error("خطأ أثناء إنشاء الدفعة");
  }
}


