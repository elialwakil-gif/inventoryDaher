import getAllSells from "@/services/sells";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
export interface Sell {
  id: number | string;
  productName?: string;
  productCode?: string;
  product?: {
    name?: string;
    code?: string;
  };
  products?: {
    id?: string;
    productId?: string;
    name?: string;
    code?: string;
    category?: string;
    warehouse?: string;
    qty?: number | string;
    quantity?: number | string;
    payPrice?: number | string;
    sellPrice?: number | string;
    unit?: string;
    updatedDate?: string;
  }[];
  quantity?: number | string;
  qty?: number | string;
  reason?: string;
  date?: string;
  createdAt?: string;
  customerId?: string;
  customerName?: string;
  customer?: {
    name?: string;
  };
  supplierName?: string;
  supplier?: {
    name?: string;
  };
  invoiceNumber?: string;
  sellId?: number | string;
  totalPrice?: number | string;
  totalUSD?: number | string;
  totalSYP?: number | string;
  amount_base?: number | string;
  currency?: string;
  exchangeRate?: number | string;
  paymentStatus?: "cash" | "part" | "debt" | string;
  remainingDebt?: number | string;
  partValue?: number | string;
  paymentAccountId?: string;
  salesAccountId?: string;
}

export function useSells(): UseQueryResult<Sell[], Error> {
  return useQuery<Sell[], Error>({
    queryKey: queryKeys.sells,
    queryFn: getAllSells,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
