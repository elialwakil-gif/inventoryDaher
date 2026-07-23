import apiClient from "@/lib/axios";
import type { Product, sell } from "@/services/transaction";
import type { Warehouse } from "@/services/warehouse";

export type VehicleWarehouse = Warehouse & {
  type: "vehicle";
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
};

export interface VehicleTotals {
  productsCount: number;
  totalQuantity: number;
  stockCostValue: number;
  stockSellValue: number;
  salesCount: number;
  salesTotal: number;
}

export interface VehicleSummary {
  vehicle: VehicleWarehouse;
  products: Product[];
  sales: sell[];
  totals: VehicleTotals;
}

export interface CreateVehiclePayload {
  name: string;
  location?: string;
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
  defaultPaymentAccountId?: string;
  defaultReceivableAccountId?: string;
  defaultSalesAccountId?: string;
}

export interface UpdateVehiclePayload
  extends Partial<Omit<CreateVehiclePayload, "name">> {
  isActive?: boolean;
}

export interface LoadVehiclePayload {
  sourceWarehouse: string;
  note?: string;
  items: Array<{
    productId: string;
    quantity: number;
    sellPrice?: number;
  }>;
}

const normalizeVehicleSummaries = (data: any): VehicleSummary[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.vehicles)) return data.vehicles;
  return [];
};

const extractVehicleSummary = (data: any): VehicleSummary | null =>
  data?.data || data?.vehicle || data || null;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export async function getAllVehicles(date?: string) {
  try {
    const response = await apiClient.get("/api/vehicles", {
      params: date ? { date } : undefined,
    });
    return normalizeVehicleSummaries(response.data);
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to fetch vehicles"));
  }
}

export async function getMyVehicle(date?: string) {
  try {
    const response = await apiClient.get("/api/vehicles/me", {
      params: date ? { date } : undefined,
    });
    return extractVehicleSummary(response.data);
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to fetch driver vehicle"));
  }
}

export async function createVehicle(payload: CreateVehiclePayload) {
  try {
    const response = await apiClient.post("/api/vehicles", payload);
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to create vehicle"));
  }
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload) {
  try {
    const response = await apiClient.put(`/api/vehicles/${id}`, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to update vehicle"));
  }
}

export async function loadVehicle(id: string, payload: LoadVehiclePayload) {
  try {
    const response = await apiClient.post(`/api/vehicles/${id}/load`, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to load vehicle"));
  }
}

export async function createMyVehicleSale(newSell: sell) {
  try {
    const response = await apiClient.post("/api/vehicles/me/sell", { newSell });
    return response.data;
  } catch (error: any) {
    throw new Error(getErrorMessage(error, "Failed to create vehicle sale"));
  }
}
