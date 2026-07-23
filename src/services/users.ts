import type { AppPermission } from "@/config/permissions";
import apiClient from "@/lib/axios";

export interface InventoryUserRecord {
  id?: string | number;
  _id?: string | number;
  username: string;
  role: string;
  permissions?: AppPermission[] | string[];
  vehicleId?: string;
  vehicleName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: string;
  permissions: AppPermission[];
}

export interface UpdateUserPayload {
  role: string;
  permissions: AppPermission[];
  password?: string;
}

function normalizeUsersResponse(data: any): InventoryUserRecord[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

export async function getAllUsers() {
  try {
    const response = await apiClient.get("/api/users");
    return normalizeUsersResponse(response.data);
  } catch (err) {
    console.error("Error while fetching users:", err);
    throw new Error("حدث خطأ أثناء جلب المستخدمين");
  }
}

export async function addUser(payload: CreateUserPayload) {
  try {
    const response = await apiClient.post("/api/users", payload);
    return response.data;
  } catch (err) {
    console.error("Error while adding user:", err);
    throw new Error("حدث خطأ أثناء إضافة المستخدم");
  }
}

export async function updateUser(
  id: string | number,
  payload: UpdateUserPayload,
) {
  try {
    const response = await apiClient.put(`/api/users/${id}`, payload);
    return response.data;
  } catch (err) {
    console.error("Error while updating user:", err);
    throw new Error("حدث خطأ أثناء تعديل المستخدم");
  }
}

export async function deleteUser(id: string | number) {
  try {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  } catch (err) {
    console.error("Error while deleting user:", err);
    throw new Error("حدث خطأ أثناء حذف المستخدم");
  }
}
