import { ProductTableRow } from "@/pages/Products";
import { handleWarehouseTransfare } from "@/services/transaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import AccountSelect from "../Accounts/AccountSelect";
import PaymentTypeSelector from "../sellProduct/PaymentTypeSelector";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import PopupForm from "../ui/custom/PopupForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import WarehouseSelect from "../Warehouses/WarehouseSelect";

interface TransferFormProps {
  row: ProductTableRow;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const transferSchema = z.object({
  warehouse: z.string().min(1, "اختر المستودع المنقول إليه"),
  quantity: z.coerce.number().positive("الكمية يجب أن تكون أكبر من صفر"),
  sellPrice: z.coerce.number().positive("سعر المبيع غير صحيح"),
  amount: z.coerce.number().min(0, "تكلفة النقل غير صحيحة"),
  currency: z.enum(["USD", "SYP"]),
  exchangeRate: z.coerce.number().positive("سعر الصرف غير صحيح"),
  note: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

export default function TransferForm({
  row,
  isOpen,
  setIsOpen,
}: TransferFormProps) {
  const queryClient = useQueryClient();
  const [isDebt, setIsDebt] = useState<"cash" | "debt" | "part">("cash");
  const [partValue, setPartValue] = useState(0);
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [payableAccountId, setPayableAccountId] = useState("");

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      warehouse: "",
      quantity: 0,
      sellPrice: row.sellPrice,
      amount: 0,
      currency: "USD",
      exchangeRate: 1,
      note: "",
    },
  });

  const transferAmount = Number(watch("amount") || 0);
  const currency = watch("currency");

  useEffect(() => {
    if (!row) return;

    reset({
      warehouse: "",
      quantity: 0,
      sellPrice: row.sellPrice,
      amount: 0,
      currency: "USD",
      exchangeRate: 1,
      note: "",
    });
    setExpenseAccountId("");
    setPaymentAccountId("");
    setPayableAccountId("");
    setIsDebt("cash");
    setPartValue(0);
  }, [row, reset]);

  const warehouseTransfare = useMutation({
    mutationFn: (transferData: {
      productId: string;
      oldWarehouse: string;
      newWarehouse: string;
      exchangeRate: number;
      amount_base: number;
      amount: number;
      currency: string;
      quantity: number;
      note: string;
      newSellPrice?: number;
      paymentStatus?: "cash" | "debt" | "part";
      partValue?: number;
      expenseAccountId?: string;
      paymentAccountId?: string;
      payableAccountId?: string;
    }) => handleWarehouseTransfare(transferData),
    onSuccess: () => {
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["products-table"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses-table"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء نقل المنتج");
    },
  });

  const onSubmit = (values: TransferFormValues) => {
    if (values.quantity > row.quantity) {
      toast.error("الكمية المدخلة أكبر من الكمية المتوفرة");
      return;
    }

    if (values.amount > 0 && isDebt === "part" && partValue <= 0) {
      toast.error("الرجاء إدخال قيمة الدفعة الجزئية");
      return;
    }

    if (values.amount > 0 && isDebt === "part" && partValue >= values.amount) {
      toast.error("قيمة الدفعة الجزئية يجب أن تكون أقل من المبلغ الكلي");
      return;
    }

    if (values.amount > 0 && !expenseAccountId) {
      toast.error("الرجاء اختيار حساب أجور النقل");
      return;
    }

    if (values.amount > 0 && (isDebt === "cash" || isDebt === "part") && !paymentAccountId) {
      toast.error("الرجاء اختيار حساب الدفع");
      return;
    }

    if (values.amount > 0 && (isDebt === "debt" || isDebt === "part") && !payableAccountId) {
      toast.error("الرجاء اختيار حساب الموردين");
      return;
    }

    warehouseTransfare.mutate({
      productId: row.id,
      oldWarehouse: row.warehouse,
      newWarehouse: values.warehouse,
      exchangeRate: values.currency === "USD" ? 1 : values.exchangeRate,
      amount_base: values.amount,
      amount: values.amount,
      currency: values.currency,
      quantity: values.quantity,
      note: values.note || "",
      newSellPrice: values.sellPrice,
      paymentStatus: values.amount > 0 ? isDebt : "cash",
      partValue: isDebt === "part" ? partValue : 0,
      expenseAccountId: values.amount > 0 ? expenseAccountId : undefined,
      paymentAccountId:
        values.amount > 0 && isDebt !== "debt" ? paymentAccountId : undefined,
      payableAccountId:
        values.amount > 0 && isDebt !== "cash" ? payableAccountId : undefined,
    });
  };

  const handleSetMaxQuantity = () => {
    setValue("quantity", row.quantity);
  };

  return (
    <PopupForm
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={<></>}
      title="نقل منتج"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden max-h-[75vh] md:grid-cols-2">
          <FormInput label="اسم المنتج" disabled value={row.name} />
          <FormInput label="صنف المنتج" disabled value={row.category} />
          <FormInput label="الوحدة" disabled value={row.unit} />
          <FormInput label="المستودع القديم" disabled value={row.warehouse} />

          <Controller
            name="warehouse"
            control={control}
            render={({ field }) => (
              <WarehouseSelect value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.warehouse && (
            <p className="text-sm text-red-500">{errors.warehouse.message}</p>
          )}

          <div className="flex">
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="number"
                  label="الكمية المراد نقلها"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="rounded-l-none"
                />
              )}
            />

            <Button
              type="button"
              className="mt-6 rounded-r-none"
              onClick={handleSetMaxQuantity}
            >
              {row.quantity}
            </Button>
          </div>
          {errors.quantity && (
            <p className="text-sm text-red-500">{errors.quantity.message}</p>
          )}

          <Controller
            name="sellPrice"
            control={control}
            render={({ field }) => (
              <FormInput
                type="number"
                label="سعر المبيع"
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            )}
          />
          {errors.sellPrice && (
            <p className="text-sm text-red-500">{errors.sellPrice.message}</p>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:col-span-1">
            <div className="sm:col-span-2">
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <FormInput
                    label="تكلفة النقل"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    className="rounded-l-none"
                  />
                )}
              />
            </div>

            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-6 rounded-r-none">
                    <SelectValue placeholder="العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {["SYP", "USD"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {currency === "SYP" && transferAmount > 0 && (
            <Controller
              name="exchangeRate"
              control={control}
              render={({ field }) => (
                <FormInput
                  type="number"
                  label="سعر الصرف"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
          )}

          <div className="md:col-span-2">
            <PaymentTypeSelector
              value={isDebt}
              onChange={setIsDebt}
              partValue={partValue}
              onPartValueChange={setPartValue}
            />
          </div>

          {transferAmount > 0 && (
            <>
              <AccountSelect
                label="حساب أجور النقل"
                value={expenseAccountId}
                onChange={setExpenseAccountId}
                filterType="expense"
              />
              {(isDebt === "cash" || isDebt === "part") && (
                <AccountSelect
                  label="حساب الدفع"
                  value={paymentAccountId}
                  onChange={setPaymentAccountId}
                  filterType="payment"
                />
              )}
              {(isDebt === "debt" || isDebt === "part") && (
                <AccountSelect
                  label="حساب الموردين"
                  value={payableAccountId}
                  onChange={setPayableAccountId}
                  filterType="payable"
                />
              )}
            </>
          )}

          <div className="md:col-span-2">
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <FormInput
                  label="ملاحظات النقل"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button
            type="submit"
            className="w-full md:col-span-2"
            disabled={warehouseTransfare.isPending}
            loading={warehouseTransfare.isPending}
          >
            {warehouseTransfare.isPending ? "جاري النقل..." : "تأكيد"}
          </Button>
        </div>
      </form>
    </PopupForm>
  );
}
