import { useWarehouseContext } from "@/contexts/WarehouseContexts";
import FormInput from "../ui/custom/FormInput";

interface Props {
  label?: string
  value?: string;
  onChange: (value: string) => void;
}

export default function WarehouseSelect({ value, onChange, label }: Props) {
  const { data: warehouses = [], isLoading } = useWarehouseContext();

  const isOther = value === "other";


  return (
    <div>
      {!isOther && (
        <FormInput
          disabled={isLoading}
          label={label || "المستودع المنقول إليه"}
          value={value}
          options={[
            ...warehouses
            .map((wh: any) => wh.name?.trim()) // استخراج الاسم فقط
            .filter(Boolean)
            .map((name) => ({
              id: name,
              name,
            })),

          ]}
          onChange={(e: any) => onChange(e.target.value)}
        />
      )}

      {isOther && (
        <FormInput
          label="المستودع المنقول إليه"
          placeholder="أدخل اسم المستودع الجديد"
          onBlur={(e) => {
            if (!e.target.value) return;
            onChange(e.target.value); // ✅ تحديث RHF مباشرة
          }}
        />
      )}
    </div>
  );
}
