import apiClient from "@/lib/axios";
import type { DriverMovement, DriverStatement } from "@/types/driverFinance";

export type DriverStatementFilters = Partial<DriverStatement["filters"]>;
export interface DriverCollectionPayload {
  requestId: string;
  driverId: string;
  sellId: string;
  customerId: string;
  vehicleId?: string;
  amountOriginal: number;
  currency: "USD" | "SYP";
  exchangeRate: number;
  paymentAccountId: string;
  receivableAccountId: string;
  date?: string;
  note?: string;
}
export type DriverMovementPayload = Pick<
  DriverMovement,
  | "requestId"
  | "driverId"
  | "type"
  | "currency"
  | "exchangeRate"
  | "amountOriginal"
> &
  Partial<
    Pick<
      DriverMovement,
      | "vehicleId"
      | "date"
      | "note"
      | "payoutSource"
      | "sourceAccountId"
      | "destinationAccountId"
      | "expenseAccountId"
      | "openingCashOriginal"
      | "openingCommissionUSD"
      | "stock"
    >
  >;

function serviceError(error: unknown, fallback: string): Error {
  const failure = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return new Error(
    failure.response?.data?.message ||
      failure.response?.data?.error ||
      failure.message ||
      fallback,
  );
}

export async function getDriverStatement(
  filters: DriverStatementFilters = {},
): Promise<DriverStatement> {
  try {
    const response = await apiClient.get("/api/driver-statements", {
      params: filters,
    });
    const statement = response.data?.data ?? response.data;
    if (!statement?.filters || !statement?.summary || !Array.isArray(statement.sales) || !Array.isArray(statement.collections)) {
      throw new Error("صيغة البيان المالي غير صحيحة. تأكد من تحديث الخادم ثم أعد المحاولة.");
    }
    return statement;
  } catch (error) {
    throw serviceError(error, "تعذر جلب البيان المالي للسائق");
  }
}

export async function recordDriverCollection(payload: DriverCollectionPayload) {
  try {
    const response = await apiClient.post(
      "/api/driver-statements/collections",
      payload,
    );
    return response.data;
  } catch (error) {
    throw serviceError(error, "تعذر تسجيل التحصيل");
  }
}

export async function recordDriverMovement(payload: DriverMovementPayload) {
  try {
    const response = await apiClient.post(
      "/api/driver-statements/movements",
      payload,
    );
    return response.data;
  } catch (error) {
    throw serviceError(error, "تعذر تسجيل حركة السائق");
  }
}
