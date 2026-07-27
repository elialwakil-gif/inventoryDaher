import AccountSelect from "@/components/Accounts/AccountSelect";
import { updateCustomer } from "@/services/customer";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { updateSupplier } from "@/services/supplier";
import { toast } from "sonner";

export interface Customer {
  id?: string;
  _id?: string;
  name?: string;
  number?: string;
  balance?: number;
  createdDate?: string;
  updatedDate?: string;
  createdAt?: string | Date;
  defaultPaymentAccountId?: string;
  defaultReceivableAccountId?: string;
  defaultSalesAccountId?: string;
  defaultPayableAccountId?: string;
  defaultInventoryAccountId?: string;
  [key: string]: any;
}

interface DetailsInputsProps {
  customer: Customer;
  setCustomer: React.Dispatch<React.SetStateAction<Customer>>;
  isSupplier?: boolean;
}

export default function DetailsInputs({
  customer,
  setCustomer,
  isSupplier = false,
}: DetailsInputsProps) {
  const queryClient = useQueryClient();
  const originalCustomerRef = useRef<Customer | null>(null);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    if (!originalCustomerRef.current) return;
    setIsChanged(
      JSON.stringify(customer) !== JSON.stringify(originalCustomerRef.current),
    );
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    originalCustomerRef.current = structuredClone(customer);
    setIsChanged(false);
  }, [customer.id, customer._id]);

  const handleChange = (key: keyof Customer, value: any) => {
    setCustomer((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (isSupplier) {
      updateSupplierMutation.mutate(customer);
    } else {
      updateCustomerMutation.mutate(customer);
    }
  };

  const updateCustomerMutation = useMutation({
    mutationFn: async (updatedCustomer: Customer) => {
      const customerId = updatedCustomer.id || updatedCustomer._id;
      if (!customerId) throw new Error("Customer ID not found");
      return updateCustomer(customerId, updatedCustomer);
    },
    onSuccess: (_, updatedCustomer) => {
      originalCustomerRef.current = structuredClone(updatedCustomer);
      setIsChanged(false);
      queryClient.invalidateQueries({ queryKey: ["customers-table"] });
      queryClient.invalidateQueries({ queryKey: ["customer-details"] });
      toast.success("تم حفظ التعديلات!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (updatedSupplier: Customer) => {
      const supplierId = updatedSupplier.id || updatedSupplier._id;
      if (!supplierId) throw new Error("Supplier ID not found");
      return updateSupplier(supplierId, updatedSupplier);
    },
    onSuccess: (_, updatedSupplier) => {
      originalCustomerRef.current = structuredClone(updatedSupplier);
      setIsChanged(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers-table"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-details"] });
      toast.success("تم حفظ التعديلات!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    },
  });

  const convertLabel = (key: string) => {
    const labels: Record<string, string> = {
      balanceUSD: "الرصيد USD",
      balanceSYP: "الرصيد SYP",
      name: "الاسم",
      balance: "الرصيد",
      createdAt: "تاريخ الإنشاء",
      createdDate: "تاريخ الإنشاء",
      updatedDate: "تاريخ آخر تعديل",
      number: "الرقم",
      defaultPaymentAccountId: "حساب الدفع الافتراضي",
      defaultReceivableAccountId: "حساب العملاء الافتراضي",
      defaultSalesAccountId: "حساب المبيعات الافتراضي",
      defaultPayableAccountId: "حساب الموردين الافتراضي",
      defaultInventoryAccountId: "حساب المخزون الافتراضي",
    };
    return labels[key] || key;
  };

  const getFilterType = (key: string) => {
    if (key === "defaultPaymentAccountId") return "payment";
    if (key === "defaultReceivableAccountId") return "receivable";
    if (key === "defaultSalesAccountId") return "sales";
    if (key === "defaultPayableAccountId") return "payable";
    if (key === "defaultInventoryAccountId") return "inventory";
    return "all";
  };

  const accountFields = [
    "defaultPaymentAccountId",
    "defaultReceivableAccountId",
    "defaultSalesAccountId",
    "defaultPayableAccountId",
    "defaultInventoryAccountId",
  ];

  if (!customer) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
      {Object.entries(customer).map(([key, value]) => {
        if (["id", "purchases", "payments"].includes(key)) {
          return null;
        }

        if (
          isSupplier &&
          ["defaultReceivableAccountId", "defaultSalesAccountId"].includes(key)
        ) {
          return null;
        }

        if (
          !isSupplier &&
          ["defaultPayableAccountId", "defaultInventoryAccountId"].includes(key)
        ) {
          return null;
        }

        if (accountFields.includes(key)) {
          return (
            <AccountSelect
              key={key}
              label={convertLabel(key)}
              value={value ?? ""}
              onChange={(newValue) => handleChange(key, newValue)}
              filterType={getFilterType(key) as any}
            />
          );
        }

        if (key === "createdAt") {
          return (
            <div key={key} className="flex gap-2 mb-4 items-end">
              <label className="font-bold w-36">{convertLabel(key)}:</label>
              <input
                value={new Date(value as any).toLocaleString("en-GB")}
                disabled
                className="bg-transparent border-b-2 w-full"
              />
            </div>
          );
        }

        return (
          <div key={key} className="flex gap-2 mb-4 items-end group relative">
            <label className="font-bold w-36">{convertLabel(key)}:</label>
            <input
              readOnly={
                key === "id" ||
                key === "balance" ||
                key === "balanceUSD" ||
                key === "balanceSYP"
              }
              disabled={key === "address"}
              value={value ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              className="bg-transparent border-b-2 border-transparent focus:border-primary-500 outline-none transition-all w-full"
            />
            <span className="absolute bottom-0 right-0 w-full h-[2px] bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform"></span>
          </div>
        );
      })}

      {isChanged && (
        <Button
          variant="accent"
          className="w-full"
          disabled={
            updateCustomerMutation.isPending || updateSupplierMutation.isPending
          }
          loading={
            updateCustomerMutation.isPending || updateSupplierMutation.isPending
          }
          onClick={handleSave}
        >
          {updateCustomerMutation.isPending || updateSupplierMutation.isPending
            ? "جارٍ الحفظ..."
            : "حفظ التعديلات"}
        </Button>
      )}
    </div>
  );
}
