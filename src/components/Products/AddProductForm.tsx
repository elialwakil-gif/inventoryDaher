import React, { useEffect } from "react";
import PopupForm from "../ui/custom/PopupForm";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { payNewProduct } from "@/services/transaction";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addProductSchema } from "@/schemas/addProduct.schema";
import { z } from "zod";
import SupplierSelect from "./SupplierSelect";
import AccountSelect from "../Accounts/AccountSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import WarehouseSelect from "../Warehouses/WarehouseSelect";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import { useProductsGrouping } from "@/hooks/useProductsGrouping";
import { buildInvoiceMoney } from "@/lib/money";

type FormValues = z.infer<typeof addProductSchema>;

export default function AddProductForm({
  isOpen,
  setIsOpen,
  row,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  row?: any;
}) {
  const { groupByCategory } = useProductsGrouping();
  const groupedProducts = groupByCategory();
  const categoriesName = Object.keys(groupedProducts).map((c) => ({
    id: c,
    name: c,
  }));

  const queryClient = useQueryClient();
  const [openSupplier, setOpenSupplier] = React.useState(false);
  const [isCustomCategory, setIsCustomCategory] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      isDebt: "cash",
      currency: "USD",
      exchangeRate: 1,
      inventoryAccountId: "",
      payableAccountId: "",
      paymentAccountId: "",
      alertQuantity: 5,
    },
  });

  const isDebt = watch("isDebt");
  const currency = watch("currency");

  useEffect(() => {
    if (!row) return;

    reset({
      name: row.name,
      code: row.code,
      category: row.category,
      warehouse: row.warehouse,
      payPrice: row.payPrice,
      wholesalePrice: row.wholesalePrice ?? row.sellPrice,
      superWholesalePrice: row.superWholesalePrice ?? row.wholesalePrice ?? row.sellPrice,
      sellPrice: row.sellPrice,
      unit: row.unit,
      quantity: row.quantity ?? 1,
      alertQuantity: row.alertQuantity ?? row.lowStockLimit ?? row.minQuantity ?? 5,
      supplierId: row.supplierId ?? "",
      isDebt: "cash",
      currency: "USD",
      exchangeRate: 1,
      inventoryAccountId: row.inventoryAccountId ?? "",
      payableAccountId: row.payableAccountId ?? "",
      paymentAccountId: row.paymentAccountId ?? "",
    });
  }, [row, reset]);

  const mutation = useMutation({
    mutationFn: (data: { newProduct: any; newPurchase: any }) =>
      payNewProduct(data),
    onSuccess: () => {
      reset();
      setIsOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.products,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.journalEntries,
      });
      queryClient.invalidateQueries({
        queryKey: ["payments-table"],
      });
      queryClient.invalidateQueries({
        queryKey: ["suppliers-table"],
      });
      queryClient.invalidateQueries({
        queryKey: ["supplier-details"],
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "فشل في إضافة المنتج");
    },
  });

  const onSubmit = (values: FormValues) => {
    const total = values.quantity * values.payPrice;

    if (!values.currency) {
      toast.error("الرجاء اختيار العملة");
      return;
    }

    if (values.isDebt === "part" && (values.partValue ?? 0) <= 0) {
      toast.error("الرجاء إدخال قيمة الدفعة الجزئية");
      return;
    }

    if (
      values.currency === "SYP" &&
      values.exchangeRate <= 0
    ) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return;
    }

    const purchaseMoney = buildInvoiceMoney({
      totalUSD: total,
      paymentStatus: values.isDebt,
      currency: values.currency,
      exchangeRate: values.exchangeRate,
      partValue: values.partValue,
    });

    if (values.isDebt === "part" && purchaseMoney.paidUSD >= total) {
      toast.error("قيمة الدفعة الجزئية لا يمكن أن تكون أكبر أو تساوي المبلغ الكلي");
      return;
    }

    if (values.isDebt !== "debt" && !values.paymentAccountId) {
      toast.error("الرجاء اختيار حساب الدفع");
      return;
    }

    mutation.mutate({
      newProduct: {
        name: values.name,
        code: values.code,
        category: values.category,
        warehouse: values.warehouse,
        payPrice: values.payPrice,
        wholesalePrice: values.wholesalePrice,
        superWholesalePrice: values.superWholesalePrice,
        sellPrice: values.sellPrice,
        unit: values.unit,
        quantity: values.quantity,
        alertQuantity: values.alertQuantity,
      },
      newPurchase: {
        supplierId: values.supplierId,
        name: values.name,
        code: values.code,
        warehouse: values.warehouse,
        quantity: values.quantity,
        payPrice: values.payPrice,
        wholesalePrice: values.wholesalePrice,
        superWholesalePrice: values.superWholesalePrice,
        currency: purchaseMoney.paymentCurrency,
        paymentCurrency: purchaseMoney.paymentCurrency,
        priceCurrency: purchaseMoney.priceCurrency,
        exchangeRate: purchaseMoney.exchangeRate,
        amount_base: purchaseMoney.totalOriginal,
        totalPrice: purchaseMoney.totalUSD,
        totalUSD: purchaseMoney.totalUSD,
        totalSYP: purchaseMoney.totalSYP,
        totalOriginal: purchaseMoney.totalOriginal,
        paidUSD: purchaseMoney.paidUSD,
        paidSYP: purchaseMoney.paidSYP,
        paidOriginal: purchaseMoney.paidOriginal,
        paymentStatus: values.isDebt,
        remainingDebt: purchaseMoney.remainingUSD,
        remainingUSD: purchaseMoney.remainingUSD,
        remainingSYP: purchaseMoney.remainingSYP,
        remainingOriginal: purchaseMoney.remainingOriginal,
        partValue: purchaseMoney.paidOriginal,
        inventoryAccountId: values.inventoryAccountId,
        payableAccountId: values.payableAccountId,
        paymentAccountId:
          values.isDebt === "debt" ? undefined : values.paymentAccountId,
      },
    });
  };

  return (
    <PopupForm
      trigger={<></>}
      title={row ? "تعديل المنتج" : "شراء منتجات"}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <form
        dir="rtl"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto overflow-x-hidden"
      >
        <FormInput
          label="اسم المنتج"
          {...register("name")}
          error={errors.name?.message}
        />
        <FormInput
          label="رمز المنتج"
          {...register("code")}
          error={errors.code?.message}
        />

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <div>
              <label>اختر الصنف</label>
              <Select
                value={isCustomCategory ? "custom" : field.value}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setIsCustomCategory(true);
                    field.onChange("");
                  } else {
                    setIsCustomCategory(false);
                    field.onChange(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الصنف" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesName.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">غير ذلك</SelectItem>
                </SelectContent>
              </Select>

              {isCustomCategory && (
                <FormInput
                  label="اكتب الصنف"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}

              {errors.category?.message && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          control={control}
          name="warehouse"
          render={({ field }) => (
            <div>
              <WarehouseSelect value={field.value} onChange={field.onChange} />
              {errors.warehouse?.message && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.warehouse.message}
                </p>
              )}
            </div>
          )}
        />

        <FormInput
          label="سعر الشراء"
          type="number"
          {...register("payPrice")}
          error={errors.payPrice?.message}
        />
        <FormInput
          label="سعر الجملة"
          type="number"
          {...register("wholesalePrice")}
          error={errors.wholesalePrice?.message}
        />
        <FormInput
          label="سعر جملة الجملة"
          type="number"
          {...register("superWholesalePrice")}
          error={errors.superWholesalePrice?.message}
        />
        <FormInput
          label="سعر المبيع"
          type="number"
          {...register("sellPrice")}
          error={errors.sellPrice?.message}
        />
        <FormInput
          label="الكمية"
          type="number"
          {...register("quantity")}
          error={errors.quantity?.message}
        />
        <FormInput
          label="حد التنبيه"
          type="number"
          min={0}
          {...register("alertQuantity")}
          error={errors.alertQuantity?.message}
        />
        <FormInput
          label="الواحدة"
          {...register("unit")}
          error={errors.unit?.message}
        />

        <div className="md:col-span-2 grid grid-cols-3 gap-2">
          {(["cash", "part", "debt"] as const).map((v) => (
            <Button
              key={v}
              type="button"
              variant={isDebt === v ? "default" : "outline"}
              onClick={() => setValue("isDebt", v)}
            >
              {v === "cash" ? "نقدا" : v === "part" ? "جزئي" : "دين"}
            </Button>
          ))}
        </div>

        {isDebt === "part" && (
          <FormInput
            label="قيمة الدفعة"
            type="number"
            {...register("partValue")}
            error={errors.partValue?.message}
          />
        )}

        <>
          <>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <div>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-6">
                      <SelectValue placeholder="العملة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="SYP">SYP</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.currency?.message && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.currency.message}
                    </p>
                  )}
                </div>
              )}
            />

            <FormInput
              label="سعر الصرف"
              type="number"
              disabled={currency === "USD"}
              {...register("exchangeRate")}
              error={errors.exchangeRate?.message}
            />
          </>
        </>

        <Controller
          control={control}
          name="inventoryAccountId"
          render={({ field }) => (
            <AccountSelect
              label="حساب المخزون"
              value={field.value}
              onChange={field.onChange}
              filterType="inventory"
              error={errors.inventoryAccountId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="payableAccountId"
          render={({ field }) => (
            <AccountSelect
              label="حساب الموردين"
              value={field.value}
              onChange={field.onChange}
              filterType="payable"
              error={errors.payableAccountId?.message}
            />
          )}
        />

        {isDebt !== "debt" && (
          <Controller
            control={control}
            name="paymentAccountId"
            render={({ field }) => (
              <AccountSelect
                label="حساب الدفع"
                value={field.value}
                onChange={field.onChange}
                filterType="payment"
                error={errors.paymentAccountId?.message}
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="supplierId"
          render={({ field }) => (
            <div>
              <SupplierSelect
                className="mt-6"
                isOpen={openSupplier}
                setIsOpen={setOpenSupplier}
                supplierId={field.value}
                setSupplierId={field.onChange}
                withDataTable
              />
              {errors.supplierId?.message && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.supplierId.message}
                </p>
              )}
            </div>
          )}
        />

        <Button
          className="md:col-span-2"
          type="submit"
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          {row ? "تعديل" : "إضافة"}
        </Button>
      </form>
    </PopupForm>
  );
}
