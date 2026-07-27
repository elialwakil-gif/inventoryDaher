import apiClient from "@/lib/axios";
import {
  getOfflineCache,
  isBrowserOnline,
  setOfflineCache,
} from "@/lib/offlineStore";
import { offlineCacheKeys } from "@/services/offlineSales";

export default async function getAllProducts() {
  return getProducts({ pricing: "full" });
}

export async function getProducts({
  pricing = "full",
}: {
  pricing?: "full" | "table";
} = {}) {
  const cacheKey =
    pricing === "table"
      ? `${offlineCacheKeys.products}:table`
      : offlineCacheKeys.products;

  if (!isBrowserOnline()) {
    const cachedProducts = await getOfflineCache(cacheKey);

    if (cachedProducts) {
      return cachedProducts;
    }
  }

  try {
    const response = await apiClient.get("/api/products", {
      params: { pricing },
    });
    await setOfflineCache(cacheKey, response.data);
    return response.data;
  } catch (err) {
    const cachedProducts = await getOfflineCache(cacheKey);

    if (cachedProducts) {
      return cachedProducts;
    }

    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب المنتجات");
  }
}






export async function addProduct({
  productName,
  code,
  category,
  warehouse,
  payPrice,
  wholesalePrice,
  superWholesalePrice,
  sellPrice,
  unit,
  quantity,
  alertQuantity,
}) {
  try {
    const response = await apiClient.post("/api/products", {
      name: productName,
      code,
      category,
      warehouse,
      payPrice,
      wholesalePrice,
      superWholesalePrice,
      sellPrice,
      unit,
      quantity,
      alertQuantity,
    });
    return response.data;
  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    throw new Error("خطأ أثناء إضافة منتج جديد");
  }
}

export async function getProductById(id: string) {
  try {
    const response = await apiClient.post("/api/products/byId", { id });
    return response.data;
  } catch (err) {
    console.error("❌ خطأ في جلب المنتج:", err);
    throw new Error("خطأ أثناء جلب المنتج بواسطة المعرف");
  }
}

export const updateProduct = async (id: string, newData: any) => {
  const res = await apiClient.put(`/api/products/${id}`, newData);
  return res.data;
};

export const deleteProduct = async (id: string) => {
  const res = await apiClient.delete(`/api/products/${id}`);
  return res.data;
};

export const bulkUpdateProductPrices = async (data: {
  productIds: string[];
  percentageIncrease: number;
  priceType:
    | "sellPrice"
    | "payPrice"
    | "wholesalePrice"
    | "superWholesalePrice";
}) => {
  try {
    const response = await apiClient.post("/api/products/bulk-update-prices", data);
    return response.data;
  } catch (err) {
    console.error("❌ خطأ في تحديث الأسعار:", err);
    throw new Error("خطأ أثناء تحديث الأسعار");
  }
};
