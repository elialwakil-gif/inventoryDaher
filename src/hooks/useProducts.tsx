// hooks/useWarehouses.ts
import { queryKeys } from "@/lib/queryKeys";
import { getProducts } from "@/services/products";
import { Product } from "@/services/transaction";
import { useQuery, UseQueryResult } from "@tanstack/react-query";

export function useProducts(): UseQueryResult<Product[], Error> {
  return useQuery<Product[], Error>({
    queryKey: [...queryKeys.products, "table"],
    queryFn: () => getProducts({ pricing: "table" }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}
