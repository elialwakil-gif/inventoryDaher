import apiClient from "@/lib/axios";
import type { Product, ProductPriceType } from "@/services/transaction";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "converted";

export type QuotationProduct = Product & {
  productId?: string;
  qty: number;
  selectedPriceType?: ProductPriceType;
};

export interface Quotation {
  id?: string;
  number: string;
  customerId?: string;
  customerName: string;
  customerNumber?: string;
  products: QuotationProduct[];
  subtotal: number;
  discount: number;
  discountType?: "none" | "amount" | "percent" | "mixed";
  discountPercent?: number;
  discountPercentUSD?: number;
  discountAmountUSD?: number;
  totalPrice: number;
  currency: string;
  exchangeRate: number;
  status: QuotationStatus;
  validUntil?: string;
  note?: string;
  convertedSellId?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type QuotationInput = Omit<
  Quotation,
  "id" | "number" | "subtotal" | "totalPrice" | "date" | "createdAt" | "updatedAt"
> & {
  number?: string;
  subtotal?: number;
  totalPrice?: number;
};

export const quotationStatusLabels: Record<QuotationStatus, string> = {
  draft: "مسودة",
  sent: "مرسل",
  accepted: "مقبول",
  rejected: "مرفوض",
  converted: "محول إلى فاتورة",
};

export async function getAllQuotations() {
  const response = await apiClient.get("/api/quotations");
  return response.data as Quotation[];
}

export async function createQuotation(data: QuotationInput) {
  const response = await apiClient.post("/api/quotations", data);
  return response.data as Quotation;
}

export async function updateQuotation(id: string, data: Partial<QuotationInput>) {
  const response = await apiClient.put(`/api/quotations/${id}`, data);
  return response.data as Quotation;
}

export async function deleteQuotation(id: string) {
  const response = await apiClient.delete(`/api/quotations/${id}`);
  return response.data;
}

export async function markQuotationConverted(id: string, sellId?: string) {
  const response = await apiClient.post(`/api/quotations/${id}/converted`, {
    sellId,
  });
  return response.data as Quotation;
}
