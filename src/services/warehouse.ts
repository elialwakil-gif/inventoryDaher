import apiClient from "@/lib/axios";
import { Product } from "./transaction";

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  isActive: boolean;
  type?: "standard" | "vehicle";
  plateNumber?: string;
  driverId?: string;
  driverName?: string;
  defaultPaymentAccountId?: string;
  defaultReceivableAccountId?: string;
  defaultSalesAccountId?: string;
  createdDate: string;
  updatedDate: string;
}

export async function getAllWarehouses(): Promise<Warehouse[]> {
  try {
    const response = await apiClient.get("/api/warehouses/");


    const warehouses = response.data
    
    const result: Warehouse[] = warehouses;


    return result;
  } catch (err) {
    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب المخازن");
  }
}



export async function createNewWarehouse(name: string, location?: string): Promise<Warehouse> {
  try {
    const response = await apiClient.post("/api/warehouses/", { name, location });

    const result = response.data;

    return result;
  } catch (err) {
    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب المخازن");
  }
}

export async function getByWarehouse(name: string): Promise<Product[]> {
  try {
    const response = await apiClient.post("/api/products/getByWarehouse", {
      warehouse: name,
    });

    return response.data.products ?? [];
  } catch (err) {
    console.error("خطأ :", err);
    throw new Error("خطأ أثناء جلب المنتجات");
  }
}



export async function getSalesByWarehouseAndDate(
  warehouse: string,
  date?: string,
): Promise<any> {
  try {

    const response = await apiClient.post("/api/sells/byWarehouseDate", {
      warehouse,
      date: date,
    });

    return response.data.sales ?? [];
  } catch (error) {
    console.error("❌ خطأ في جلب المبيعات:", error);
    return [];
  }
}
