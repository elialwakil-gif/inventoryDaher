import apiClient from "@/lib/axios";

export type MaterialReservationStatus = "reserved" | "closed" | "cancelled";

export interface MaterialReservationItem {
  id: string;
  productId: string;
  name: string;
  code: string;
  category?: string;
  warehouse: string;
  unit?: string;
  payPrice?: number;
  wholesalePrice?: number;
  superWholesalePrice?: number;
  sellPrice: number;
  reservedQty: number;
  usedQty?: number;
  returnedQty?: number;
  lineTotal?: number;
}

export interface MaterialReservation {
  id: string;
  customerId: string;
  customerName?: string;
  technicianId?: string;
  technicianName: string;
  status: MaterialReservationStatus;
  items: MaterialReservationItem[];
  note?: string;
  sellId?: string;
  totalReservedQty: number;
  totalUsedQty?: number;
  totalReturnedQty?: number;
  totalPrice?: number;
  discount?: number;
  discountPercent?: number;
  discountPercentUSD?: number;
  discountAmountUSD?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  cancelledAt?: string;
}

export interface CreateMaterialReservationPayload {
  customerId: string;
  technicianId?: string;
  technicianName: string;
  note?: string;
  items: Array<{
    productId: string;
    warehouse: string;
    reservedQty: number;
    sellPrice?: number;
  }>;
}

export interface CloseMaterialReservationPayload {
  items: Array<{
    productId: string;
    warehouse: string;
    usedQty: number;
  }>;
  sell: {
    paymentStatus: "cash" | "part" | "debt";
    discount?: number;
    discountPercent?: number;
    discountPercentUSD?: number;
    discountAmountUSD?: number;
    currency: string;
    exchangeRate: number;
    partValue?: number;
    paymentAccountId?: string;
    receivableAccountId?: string;
    salesAccountId?: string;
  };
}

const normalizeReservationsResponse = (data: any): MaterialReservation[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.reservations)) return data.reservations;
  return [];
};

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export async function getAllMaterialReservations() {
  try {
    const response = await apiClient.get("/api/material-reservations");
    return normalizeReservationsResponse(response.data);
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to fetch reservations"));
  }
}

export async function createMaterialReservation(
  payload: CreateMaterialReservationPayload,
) {
  try {
    const response = await apiClient.post("/api/material-reservations", payload);
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to create reservation"));
  }
}

export async function closeMaterialReservation(
  id: string,
  payload: CloseMaterialReservationPayload,
) {
  try {
    const response = await apiClient.post(
      `/api/material-reservations/${id}/close`,
      payload,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to close reservation"));
  }
}

export async function cancelMaterialReservation(id: string) {
  try {
    const response = await apiClient.post(
      `/api/material-reservations/${id}/cancel`,
    );
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to cancel reservation"));
  }
}
