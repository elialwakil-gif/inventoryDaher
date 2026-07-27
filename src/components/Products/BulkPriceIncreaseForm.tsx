import React, { useState } from "react";
import PopupForm from "../ui/custom/PopupForm";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import { Checkbox } from "../ui/checkbox";
import { Product, ProductPriceType } from "@/services/transaction";
import { ProductTableRow } from "@/pages/Products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkUpdateProductPrices } from "@/services/products";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";

type BulkPriceIncreaseFormProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  productsData: Product[] | ProductTableRow[];
  trigger?: React.ReactNode;
};

export default function BulkPriceIncreaseForm({
  isOpen,
  setIsOpen,
  productsData,
  trigger,
}: BulkPriceIncreaseFormProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [percentageIncrease, setPercentageIncrease] = useState<number>(0);
  const [priceType, setPriceType] = useState<Exclude<ProductPriceType, "custom">>(
    "sellPrice"
  );
  const [selectAll, setSelectAll] = useState(false);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: {
      productIds: string[];
      percentageIncrease: number;
      priceType: Exclude<ProductPriceType, "custom">;
    }) => bulkUpdateProductPrices(data),
    onSuccess: () => {
      toast.success("تم تحديث الأسعار بنجاح");
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({
        queryKey: queryKeys.products,
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "فشل في تحديث الأسعار");
    },
  });

  const resetForm = () => {
    setSelectedProducts(new Set());
    setPercentageIncrease(0);
    setPriceType("sellPrice");
    setSelectAll(false);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(productsData.map((p) => p.id));
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === productsData.length);
  };

  const handleApplyIncrease = () => {
    if (selectedProducts.size === 0) {
      toast.error("الرجاء اختيار منتج واحد على الأقل");
      return;
    }

    if (percentageIncrease <= 0) {
      toast.error("الرجاء إدخال نسبة زيادة صحيحة");
      return;
    }

    mutation.mutate({
      productIds: Array.from(selectedProducts),
      percentageIncrease,
      priceType,
    });
  };

  return (
    <PopupForm
      title="زيادة الأسعار بنسبة محددة"
      trigger={trigger}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <div className="space-y-6">
        {/* نوع السعر */}
        <div className="space-y-2">
          <label className="text-sm font-medium">نوع السعر</label>
          <Select value={priceType} onValueChange={(value: any) => setPriceType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sellPrice">سعر المبيع</SelectItem>
              <SelectItem value="wholesalePrice">سعر الجملة</SelectItem>
              <SelectItem value="superWholesalePrice">سعر جملة الجملة</SelectItem>
              <SelectItem value="payPrice">سعر الشراء</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* نسبة الزيادة */}
        <FormInput
          label="نسبة الزيادة (%)"
          type="number"
          value={percentageIncrease}
          onChange={(e) => setPercentageIncrease(Number(e.target.value))}
          placeholder="مثال: 10 لزيادة 10%"
        />

        {/* اختيار المنتجات */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              اختر المنتجات ({selectedProducts.size}/{productsData.length})
            </label>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-xs font-medium cursor-pointer">
                تحديد الكل
              </label>
            </div>
          </div>

          {/* قائمة المنتجات القابلة للتمرير */}
          <ScrollArea className="h-64 border rounded-md p-3 bg-white/50">
            <div className="space-y-2">
              {productsData.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition"
                >
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => handleSelectProduct(product.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      السعر الحالي: {product[priceType] ?? "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* الأزرار */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleApplyIncrease}
            disabled={mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending ? "جاري التحديث..." : "تطبيق الزيادة"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            إلغاء
          </Button>
        </div>
      </div>
    </PopupForm>
  );
}
