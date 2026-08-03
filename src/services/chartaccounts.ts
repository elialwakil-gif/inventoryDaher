import apiClient from "@/lib/axios";
import {
    getOfflineCache,
    setOfflineCache,
} from "@/lib/offlineStore";
import { offlineCacheKeys } from "@/services/offlineSales";

export default async function createChartAccount(formData: object) {
    try {
        const res = await apiClient.post('/api/account/create-account', formData)
        return res.data
    } catch (err) {
        console.error("خطأ في إضافة الحساب:", err);
        throw new Error("خطأ أثناء إضافة حساب");
    }
}

export async function getAccount() {
        try {
        const res = await apiClient.get('/api/account/get-account')
        await setOfflineCache(offlineCacheKeys.accounts, res.data)
        return res.data
    } catch (err) {
        const cachedAccounts = await getOfflineCache(offlineCacheKeys.accounts);

        if (cachedAccounts) {
            return cachedAccounts;
        }

        console.error("خطأ في جلب الحساب:", err);
        throw new Error("خطأ أثناء جلب حساب");
    }
}

export async function updateAccount(id: string, formData: object) {
    try {
        const res = await apiClient.put(`/api/account/update-account/${id}`, formData)
        return res.data
    } catch (err) {
        console.error("خطأ في تحديث الحساب:", err);
        throw new Error("خطأ أثناء تحديث الحساب");
    }
}

export async function deleteAccount(id: string) {
    try {
        const res = await apiClient.delete(`/api/account/delete-account/${id}`)
        return res.data
    } catch (err) {
        console.error("خطأ في حذف الحساب:", err);
        throw new Error("خطأ أثناء حذف الحساب");
    }
}

export async function getAccountDetails(id:string) {
        try {
        const res = await apiClient.get(`/api/account/get-account/${id}`)
        return res.data
    } catch (err) {
        console.error("خطأ في جلب الحساب:", err);
        throw new Error("خطأ أثناء جلب حساب");
    }
}
    
    
