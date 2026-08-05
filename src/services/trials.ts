import apiClient from "@/lib/axios";

export interface TrialTenantRecord {
  tenantId: string;
  companyCode: string;
  companyName: string;
  status: string;
  templateId?: string;
  adminUsername: string;
  createdAt: string;
  expiresAt: string;
  durationDays?: number | string;
}

export interface CreateTrialTenantPayload {
  tenantId: string;
  companyCode?: string;
  companyName: string;
  username: string;
  password: string;
  durationDays: number;
  templateId?: string;
}

export interface CreateTrialTenantResponse {
  tenantId: string;
  companyCode: string;
  username: string;
  password: string;
  expiresAt: string;
  loginPath: string;
}

function normalizeTrialsResponse(data: any): TrialTenantRecord[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.trials)) return data.trials;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

export async function getTrialTenants() {
  try {
    const response = await apiClient.get("/api/trials");
    return normalizeTrialsResponse(response.data);
  } catch (error) {
    console.error("Error while fetching trial tenants:", error);
    throw new Error(getApiErrorMessage(error, "تعذر جلب النسخ التجريبية"));
  }
}

export async function createTrialTenant(payload: CreateTrialTenantPayload) {
  try {
    const response = await apiClient.post("/api/trials", payload);
    return response.data as CreateTrialTenantResponse;
  } catch (error) {
    console.error("Error while creating trial tenant:", error);
    throw new Error(getApiErrorMessage(error, "تعذر إنشاء النسخة التجريبية"));
  }
}

export async function deleteTrialTenant(tenantId: string) {
  try {
    const response = await apiClient.delete(
      `/api/trials/${encodeURIComponent(tenantId)}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error while deleting trial tenant:", error);
    throw new Error(getApiErrorMessage(error, "تعذر حذف النسخة التجريبية"));
  }
}
