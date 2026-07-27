import apiClient from "@/lib/axios";

export interface CurrencyMigrationSummary {
  dryRun: boolean;
  sells: number;
  purchases: number;
  payments: number;
  accounts: number;
  customers: number;
  suppliers: number;
  warnings: string[];
}

export async function previewCurrencyMigration() {
  const response = await apiClient.get<CurrencyMigrationSummary>(
    "/api/currency-migration/preview",
  );
  return response.data;
}

export async function runCurrencyMigration() {
  const response = await apiClient.post<CurrencyMigrationSummary>(
    "/api/currency-migration/run",
  );
  return response.data;
}
