import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { addCatalogProduct, type CatalogProductInput } from "@/services/products";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import PopupForm from "../ui/custom/PopupForm";
import WarehouseSelect from "../Warehouses/WarehouseSelect";

const catalogProductSchema = z.object({
  name: z.string().trim().min(1, "اسم المنتج مطلوب"),
  code: z.string().trim().min(1, "رمز المنتج مطلوب"),
  category: z.string().trim().min(1, "الصنف مطلوب"),
  warehouse: z.string().trim().min(1, "المستودع مطلوب"),
  unit: z.string().trim().min(1, "الوحدة مطلوبة"),
  payPrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالبًا"),
  wholesalePrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالبًا"),
  superWholesalePrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالبًا"),
  sellPrice: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالبًا"),
  alertQuantity: z.coerce.number().min(0, "حد التنبيه لا يمكن أن يكون سالبًا"),
});

type FormValues = z.infer<typeof catalogProductSchema>;

const defaultValues: FormValues = {
  name: "",
  code: "",
  category: "",
  warehouse: "",
  unit: "",
  payPrice: 0,
  wholesalePrice: 0,
  superWholesalePrice: 0,
  sellPrice: 0,
  alertQuantity: 5,
};

export default function CatalogProductForm({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(catalogProductSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: addCatalogProduct,
    onSuccess: () => {
      toast.success("تمت إضافة المنتج إلى القائمة بكمية صفر");
      reset(defaultValues);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.products });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PopupForm
      trigger={<></>}
      title="إضافة منتج إلى القائمة"
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <form
        dir="rtl"
        onSubmit={handleSubmit((values) =>
          mutation.mutate(values as CatalogProductInput),
        )}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <p className="text-sm text-muted-foreground md:col-span-2">
          سيُحفظ المنتج بكمية صفر دون شراء أو خصم من الرصيد. يمكنك شراؤه لاحقًا من قائمة
          المنتجات.
        </p>
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
        <FormInput
          label="الصنف"
          {...register("category")}
          error={errors.category?.message}
        />
        <Controller
          name="warehouse"
          control={control}
          render={({ field }) => (
            <div>
              <WarehouseSelect
                value={field.value}
                onChange={field.onChange}
                label="المستودع"
              />
              {errors.warehouse?.message && (
                <p className="mt-1 text-sm text-red-600">{errors.warehouse.message}</p>
              )}
            </div>
          )}
        />
        <FormInput label="الوحدة" {...register("unit")} error={errors.unit?.message} />
        <FormInput
          label="حد التنبيه"
          type="number"
          min={0}
          {...register("alertQuantity")}
          error={errors.alertQuantity?.message}
        />
        <FormInput
          label="سعر الشراء المتوقع (ل.س)"
          type="number"
          min={0}
          {...register("payPrice")}
          error={errors.payPrice?.message}
        />
        <FormInput
          label="سعر الجملة (ل.س)"
          type="number"
          min={0}
          {...register("wholesalePrice")}
          error={errors.wholesalePrice?.message}
        />
        <FormInput
          label="سعر جملة الجملة (ل.س)"
          type="number"
          min={0}
          {...register("superWholesalePrice")}
          error={errors.superWholesalePrice?.message}
        />
        <FormInput
          label="سعر المبيع (ل.س)"
          type="number"
          min={0}
          {...register("sellPrice")}
          error={errors.sellPrice?.message}
        />
        <Button
          type="submit"
          className="md:col-span-2"
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          حفظ في قائمة المنتجات
        </Button>
      </form>
    </PopupForm>
  );
}
