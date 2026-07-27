// schemas/addProduct.schema.ts
import { z } from "zod";

export const addProductSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  code: z.string().min(1, "رمز المنتج مطلوب"),
  category: z.string().min(1, "الصنف مطلوب"),
  warehouse: z.string().min(1, "المستودع مطلوب"),
  payPrice: z.coerce.number().positive(),
  wholesalePrice: z.coerce.number().positive(),
  superWholesalePrice: z.coerce.number().positive(),
  sellPrice: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  alertQuantity: z.coerce.number().min(0).default(5),
  unit: z.string().min(1),
  supplierId: z.string().min(1, "المورد مطلوب"),
inventoryAccountId: z.string().min(1, "حساب المخزون مطلوب"),
payableAccountId: z.string().min(1, "حساب الموردين مطلوب"),
paymentAccountId: z.string().optional(),
  isDebt: z.enum(["cash", "part", "debt"]),
  partValue: z.coerce.number().optional(),
  currency: z.enum(["USD", "SYP"]).optional(),
  exchangeRate: z.coerce.number().default(1),
});
