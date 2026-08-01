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

export interface DriverVehiclesDashboard {
  data: VehicleSummary | null;
  vehicles: VehicleSummary[];
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

export interface UpdateVehiclePayload extends Partial<
  Omit<CreateVehiclePayload, "name">
> {
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

const extractVehicleSummary = (data: any): VehicleSummary | null => {
  if (!data) return null;
  if (data.data) return data.data;
  if (data.vehicle && Array.isArray(data.products)) return data;
  if (data.vehicle?.vehicle) return data.vehicle;
  return null;
};

const normalizeDriverVehiclesDashboard = (
  data: any,
): DriverVehiclesDashboard => {
  const selectedVehicle = extractVehicleSummary(data);
  const vehicles = Array.isArray(data?.vehicles)
    ? data.vehicles
    : selectedVehicle
      ? [selectedVehicle]
      : [];

  return {
    data: selectedVehicle,
    vehicles,
  };
};

export type VehicleServiceError = Error & {
  status?: number;
  serverMessage?: string;
};

const getErrorMessage = (error: any, fallback: string) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (status === 401) {
    return "انتهت جلسة الدخول أو لا توجد صلاحية. سجّل الدخول مرة أخرى.";
  }

  if (
    status === 404 &&
    serverMessage === "No vehicle assigned to this driver"
  ) {
    return "لم يتم ربط هذا المستخدم بسيارة. اربط السائق بسيارة من صفحة السيارات ثم أعد تسجيل الدخول.";
  }

  if (
    status === 404 &&
    String(serverMessage || "").includes("Route not found")
  ) {
    return "مسار السيارات غير موجود على السيرفر المنشور. تأكد من نشر آخر نسخة من الـ backend.";
  }

  return serverMessage || error?.message || fallback;
};

const createServiceError = (
  error: any,
  fallback: string,
): VehicleServiceError => {
  const nextError = new Error(
    getErrorMessage(error, fallback),
  ) as VehicleServiceError;
  nextError.status = error?.response?.status;
  nextError.serverMessage = error?.response?.data?.message;
  return nextError;
};

export async function getAllVehicles(date?: string) {
  try {
    const response = await apiClient.get("/api/vehicles", {
      params: date ? { date } : undefined,
    });
    return normalizeVehicleSummaries(response.data);
  } catch (error: any) {
    throw createServiceError(error, "Failed to fetch vehicles");
  }
}

export async function getMyVehicleDashboard({
  date,
  vehicleId,
}: {
  date?: string;
  vehicleId?: string;
} = {}) {
  try {
    const params = {
      ...(date ? { date } : {}),
      ...(vehicleId ? { vehicleId } : {}),
    };
    const response = await apiClient.get("/api/vehicles/me", {
      params: Object.keys(params).length ? params : undefined,
    });
    return normalizeDriverVehiclesDashboard(response.data);
  } catch (error: any) {
    throw createServiceError(error, "Failed to fetch driver vehicle");
  }
}

export async function getMyVehicle(date?: string, vehicleId?: string) {
  const dashboard = await getMyVehicleDashboard({ date, vehicleId });
  return dashboard.data;
}

export async function createVehicle(payload: CreateVehiclePayload) {
  try {
    const response = await apiClient.post("/api/vehicles", payload);
    return response.data;
  } catch (error: any) {
    throw createServiceError(error, "Failed to create vehicle");
  }
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload) {
  try {
    const response = await apiClient.put(`/api/vehicles/${id}`, payload);
    return response.data;
  } catch (error: any) {
    throw createServiceError(error, "Failed to update vehicle");
  }
}

export async function loadVehicle(id: string, payload: LoadVehiclePayload) {
  try {
    const response = await apiClient.post(`/api/vehicles/${id}/load`, payload);
    return response.data;
  } catch (error: any) {
    throw createServiceError(error, "Failed to load vehicle");
  }
}

export async function createMyVehicleSale(newSell: sell) {
  try {
    const response = await apiClient.post("/api/vehicles/me/sell", { newSell });
    return response.data;
  } catch (error: any) {
    throw createServiceError(error, "Failed to create vehicle sale");
  }
}
