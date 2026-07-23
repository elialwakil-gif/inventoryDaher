import { z } from "zod";

export const discountSchema = z.object({
  discountValue: z
    .coerce.number({
      required_error: "قيمة الحسم مطلوبة",
      invalid_type_error: "يجب إدخال رقم صحيح",
    })
    .min(0.01, "يجب أن تكون القيمة أكبر من 0"),
});

export type DiscountFormValues = z.infer<typeof discountSchema>;
