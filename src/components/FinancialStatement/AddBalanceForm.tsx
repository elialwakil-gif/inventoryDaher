import { createPayment, Payment } from "@/services/payments";
import { queryKeys } from "@/lib/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import AccountSelect from "../Accounts/AccountSelect";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import PopupForm from "../ui/custom/PopupForm";
export default function AddBalanceForm({
  isOpen,
  setIsOpen,
  className,
}: {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SYP");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");
  const createPaymentMutate = useMutation({
    mutationFn: (dataToSend: Payment) => createPayment({ newPayment: dataToSend }),
    onSuccess: () => {
      toast.success("تم اضافة الدفعة!");
      setIsOpen(false);
      setAmount(0);
      setNote("");
      setCurrency("SYP");
      setPaymentAccountId("");
      setSalesAccountId("");
      queryClient.invalidateQueries({ queryKey: ["payments-table"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.journalEntries });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ اثناء الاضافة");
    },
  });
  return (
    <div>
      <PopupForm
        title="اضافة دفعة للصندوق"
        trigger={
          <Button
            className={`w-full sm:w-auto ${className || ""}`}
            onClick={(e) => {
              setIsOpen(true);
              e.stopPropagation();
            }}
            variant="accent"
          >
            قبض
          </Button>
        }
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      >
        <form
          className="space-y-4 mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (amount <= 0) {
              toast.error("الرجاء ادخال قيمة صحيحة للدفعة");
              return;
            }

            if (note.trim() === "") {
              toast.error("الرجاء ادخال ملاحظة للدفعة");
              return;
            }
            if (!paymentAccountId || !salesAccountId) {
              toast.error("الرجاء اختيار حساب القبض وحساب الإيراد");
              return;
            }
            createPaymentMutate.mutate({
              supplierId: "elidaher",
              amount: Number(amount.toFixed(1)),
              note,
              currency,
              type: "income",
              paymentAccountId,
              salesAccountId,
            });
          }}
        >
          <FormInput
            label="قيمة الدفعة"
            id="payment-amount"
            type="text"
            value={amount.toString()}
            onChange={(e) => setAmount(Number(e.target.value))}
          />

          <FormInput
            label="ملاحظات"
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <AccountSelect
            label="حساب القبض"
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            filterType="payment"
          />

          <AccountSelect
            label="حساب الإيراد"
            value={salesAccountId}
            onChange={setSalesAccountId}
            filterType="sales"
          />

          <Button
            className="w-full"
            type="submit"
            disabled={createPaymentMutate.isPending}
            loading={createPaymentMutate.isPending}
          >
            اتمام العملية
          </Button>
        </form>
      </PopupForm>
    </div>
  );
}
