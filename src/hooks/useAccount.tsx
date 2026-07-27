import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import createChartAccount, { getAccount, updateAccount, deleteAccount, getAccountDetails } from "@/services/chartaccounts";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

interface AccountFormData {
    name: string;
    code: string;
    type: string;
    category: string;
    openingBalance?: number;
    currentBalance?: number;
    currentBalanceUSD?: number;
    currentBalanceSYP?: number;
    currency: string;
    description?: string;
}

export const useCreateAccount = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (formData: AccountFormData) => {
            return createChartAccount(formData);
        },
        onSuccess: (data) => {
            // تحديث الـ cache
            queryClient.invalidateQueries({
                queryKey: queryKeys.accounts,
            });

            // عرض رسالة نجاح
            toast({
                title: "تم بنجاح",
                description: "تم إضافة الحساب بنجاح",
                variant: "default",
            });

            return data;
        },
        onError: (error: Error) => {
            // عرض رسالة خطأ
            toast({
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء إضافة الحساب",
                variant: "destructive",
            });
        },
    });
};
export const useGetAccount = () => {
    return useQuery({
        queryKey: queryKeys.accounts,        // ✅ مفتاح الاستعلام
        queryFn: async () => {
            return getAccount()              // ✅ استدعاء الدالة
        },
        staleTime: 1000 * 60 * 5,           // ✅ البيانات صالحة لـ 5 دقائق
        refetchOnWindowFocus: false,         // ✅ عدم إعادة التحميل عند التركيز
    })
}

export const useUpdateAccount = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, formData }: { id: string; formData: AccountFormData }) => {
            return updateAccount(id, formData);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.accounts,
            });

            toast({
                title: "تم بنجاح",
                description: "تم تحديث الحساب بنجاح",
                variant: "default",
            });

            return data;
        },
        onError: (error: Error) => {
            toast({
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء تحديث الحساب",
                variant: "destructive",
            });
        },
    });
};

export const useDeleteAccount = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return deleteAccount(id);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.accounts,
            });

            toast({
                title: "تم بنجاح",
                description: "تم حذف الحساب بنجاح",
                variant: "default",
            });

            return data;
        },
        onError: (error: Error) => {
            toast({
                title: "خطأ",
                description: error.message || "حدث خطأ أثناء حذف الحساب",
                variant: "destructive",
            });
        },
    });
};

export const useGetAccountDetails = (id: string) => {
    return useQuery({
        queryKey: [...queryKeys.accounts, "details", id],
        queryFn: async () => {
            return getAccountDetails(id)
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    })
}
