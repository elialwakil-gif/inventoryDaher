import apiClient from "@/lib/axios";
import type { Product, ProductPriceType, sell } from "@/services/transaction";

export type InvoicePaymentStatus = "cash" | "part" | "debt";

export type InvoiceDraftProduct = Product & {
  productId?: string;
  qty: number;
  totalPrice?: number;
  selectedPriceType?: ProductPriceType;
};

export interface InvoiceDraft {
  id?: string;
  userId?: string;
  customerId: string;
  products: InvoiceDraftProduct[];
  discount: string;
  discountPercent?: string;
  discountAmount?: string;
  paymentStatus: InvoicePaymentStatus;
  partValue: string;
  currency: string;
  exchangeRate: number;
  paymentAccountId: string;
  receivableAccountId: string;
  salesAccountId: string;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  clearedAt?: string;
}

export type InvoiceDraftUpdate = Partial<InvoiceDraft>;

const toNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizePriceType = (value: unknown): ProductPriceType => {
  const next = String(value || "custom");

  return [
    "payPrice",
    "wholesalePrice",
    "superWholesalePrice",
    "sellPrice",
    "custom",
  ].includes(next)
    ? (next as ProductPriceType)
    : "custom";
};

export const createEmptyInvoiceDraft = (): InvoiceDraft => ({
  customerId: "",
  products: [],
  discount: "",
  discountPercent: "",
  discountAmount: "",
  paymentStatus: "cash",
  partValue: "",
  currency: "USD",
  exchangeRate: 1,
  paymentAccountId: "",
  receivableAccountId: "",
  salesAccountId: "",
  version: 0,
  updatedAt: new Date().toISOString(),
});

export const normalizeInvoiceDraftProduct = (
  product: Partial<InvoiceDraftProduct> | any,
): InvoiceDraftProduct => ({
  id: String(product?.id || product?.productId || ""),
  productId: product?.productId ? String(product.productId) : undefined,
  name: String(product?.name || product?.productName || ""),
  code: String(product?.code || product?.productCode || ""),
  category: String(product?.category || ""),
  payPrice: toNumber(product?.payPrice),
  wholesalePrice: toNumber(product?.wholesalePrice),
  superWholesalePrice: toNumber(product?.superWholesalePrice),
  sellPrice: toNumber(product?.sellPrice),
  selectedPriceType: normalizePriceType(product?.selectedPriceType),
  unit: String(product?.unit || ""),
  quantity: toNumber(product?.quantity),
  warehouse: String(product?.warehouse || ""),
  updatedDate: String(product?.updatedDate || ""),
  qty: toNumber(product?.qty, 1),
  totalPrice:
    product?.totalPrice === undefined ? undefined : toNumber(product.totalPrice),
});

export const normalizeInvoiceDraft = (
  rawDraft?: Partial<InvoiceDraft> | null,
): InvoiceDraft => {
  const emptyDraft = createEmptyInvoiceDraft();

  if (!rawDraft) {
    return emptyDraft;
  }

  return {
    ...emptyDraft,
    ...rawDraft,
    customerId: String(rawDraft.customerId || ""),
    products: Array.isArray(rawDraft.products)
      ? rawDraft.products.map(normalizeInvoiceDraftProduct)
      : [],
    discount:
      rawDraft.discount === undefined || rawDraft.discount === null
        ? ""
        : String(rawDraft.discount),
    discountPercent:
      rawDraft.discountPercent === undefined || rawDraft.discountPercent === null
        ? ""
        : String(rawDraft.discountPercent),
    discountAmount:
      rawDraft.discountAmount === undefined || rawDraft.discountAmount === null
        ? ""
        : String(rawDraft.discountAmount),
    paymentStatus: ["cash", "part", "debt"].includes(
      String(rawDraft.paymentStatus),
    )
      ? (rawDraft.paymentStatus as InvoicePaymentStatus)
      : "cash",
    partValue:
      rawDraft.partValue === undefined || rawDraft.partValue === null
        ? ""
        : String(rawDraft.partValue),
    currency: String(rawDraft.currency || ""),
    exchangeRate: toNumber(rawDraft.exchangeRate, 1),
    paymentAccountId: String(rawDraft.paymentAccountId || ""),
    receivableAccountId: String(rawDraft.receivableAccountId || ""),
    salesAccountId: String(rawDraft.salesAccountId || ""),
    version: toNumber(rawDraft.version),
    updatedAt: String(rawDraft.updatedAt || emptyDraft.updatedAt || ""),
    updatedBy: rawDraft.updatedBy ? String(rawDraft.updatedBy) : undefined,
    clearedAt: rawDraft.clearedAt ? String(rawDraft.clearedAt) : undefined,
  };
};

const extractDraft = (responseData: any) =>
  normalizeInvoiceDraft(
    responseData?.draft || responseData?.data || responseData || null,
  );

export async function getMyInvoiceDraft() {
  const response = await apiClient.get("/api/invoice-draft/me");
  return extractDraft(response.data);
}

export async function updateMyInvoiceDraft(draft: InvoiceDraftUpdate) {
  const response = await apiClient.put("/api/invoice-draft/me", { draft });
  return extractDraft(response.data);
}

export async function clearMyInvoiceDraft() {
  const response = await apiClient.delete("/api/invoice-draft/me");
  return extractDraft(response.data);
}

export async function checkoutMyInvoiceDraft(newSell: sell) {
  const response = await apiClient.post("/api/invoice-draft/me/checkout", {
    newSell,
  });
  return response.data;
}
