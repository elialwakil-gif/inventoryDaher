import apiClient from "@/lib/axios";

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


