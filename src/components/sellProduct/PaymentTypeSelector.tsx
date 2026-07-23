import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaymentTypeSelectorProps {
  value: "cash" | "part" | "debt" | null;
  onChange: (val: "cash" | "part" | "debt") => void;
  partValue?: number;
  onPartValueChange?: (val: number) => void;
}

export default function PaymentTypeSelector({
  value,
  onChange,
  partValue = 0,
  onPartValueChange,
}: PaymentTypeSelectorProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const options = [
    {
      key: "cash",
      label: "نقداً",
      descTitle: "طريقة الدفع: نقدي",
      desc: "تُستخدم للمدفوعات الفورية, و في حالة الارجاع من الصندوق دون تغيير رصيد الزبون.",
    },
    {
      key: "part",
      label: "جزئي",
      descTitle: "طريقة الدفع: جزئي",
      desc: "استخدم هذه الطريقة عند دفع جزء من المبلغ فقط.",
    },
    {
      key: "debt",
      label: "دين",
      descTitle: "طريقة الدفع: دين",
      desc: "استخدم هذه الطريقة عند إضافة دين على الزبون او عند الاعادة و خصم رصيد الاعادة من رصيد الزبون.",
    },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2 md:col-span-2">
      <div className="col-span-3 font-medium mb-1">طريقة دفع المبلغ المعاد</div>

      {options.map((opt) => (
        <div key={opt.key} className="relative inline-block">
          <Button
            onMouseEnter={() => setHovered(opt.key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(opt.key)}
            onBlur={() => setHovered(null)}
            onClick={() => onChange(opt.key)}
            className="w-full"
            variant={value === opt.key ? "default" : "outline"}
            type="button"
          >
            {opt.label}
          </Button>

          {/* Tooltip */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 rounded-md px-3 py-2 text-sm 
              shadow-lg ring-1 ring-black/5 bg-white transition-all duration-150 
              ${
                hovered === opt.key
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-1 pointer-events-none"
              }
            `}
          >
            <div className="font-medium">{opt.descTitle}</div>
            <div className="mt-1 text-xs text-gray-600">{opt.desc}</div>
          </div>

          {/* السهم */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-0.5 w-3 h-3 rotate-45 bg-white 
              ring-1 ring-black/5 transition-opacity duration-150
              ${
                hovered === opt.key
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none"
              }
            `}
          />
        </div>
      ))}

      {/* إذا كان الدفع جزئي → أظهر input */}
      {value === "part" && onPartValueChange && (
        <div className="col-span-3 mt-2">
          <label className="text-sm font-medium">قيمة الدفعة</label>
          <Input
            type="number"
            value={partValue}
            onChange={(e) => onPartValueChange(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 
              focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
