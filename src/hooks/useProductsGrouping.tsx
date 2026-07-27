import { Product } from "@/services/transaction";
import { queryKeys } from "@/lib/queryKeys";
import { useQueryClient } from "@tanstack/react-query";

export type GroupedProducts = Record<string, Product[]>;

export function useProductsGrouping() {
  const queryClient = useQueryClient();

  const groupByCategory = (): GroupedProducts => {
    const products =
      queryClient.getQueryData<Product[]>([...queryKeys.products, "table"]) ||
      queryClient.getQueryData<Product[]>(queryKeys.products);

    if (!products) return {};

    return products.reduce<GroupedProducts>((acc, product) => {
      const category = product.category.trim() || "بدون تصنيف";

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(product);

      return acc;
    }, {});
  };

  return {
    groupByCategory,
  };
}
