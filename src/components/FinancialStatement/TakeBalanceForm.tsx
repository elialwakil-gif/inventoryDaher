import { createPayment, Payment } from "@/services/payments";
import { queryKeys } from "@/lib/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import AccountSelect from "../Accounts/AccountSelect";
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

export default function TakeBalanceForm({
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
  const [currency, setCurrency] = useState<string>("USD");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");

  const createPaymentMutate = useMutation({
    mutationFn: (dataToSend: Payment) =>
      createPayment({ newPayment: dataToSend }),
    onSuccess: () => {
      toast.success("تم اضافة الدفعة!");
      setIsOpen(false);
      setAmount(0);
      setNote("");
      setCurrency("USD");
      setExchangeRate(1);
      setPaymentAccountId("");
      setExpenseAccountId("");
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
        title="دفع من الصندوق"
        trigger={
          <Button
            className={className}
            onClick={(e) => {
              setIsOpen(true);
              e.stopPropagation();
            }}
            variant="destructive"
          >
            دفع
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

            if (currency !== "USD" && exchangeRate <= 0) {
              toast.error("الرجاء ادخال سعر صرف صحيح");
              return;
            }

            if (note.trim() === "") {
              toast.error("الرجاء ادخال ملاحظة للدفعة");
              return;
            }

            if (!paymentAccountId || !expenseAccountId) {
              toast.error("الرجاء اختيار حساب الدفع وحساب المصروف");
              return;
            }

            createPaymentMutate.mutate({
              supplierId: "elidaher",
              amount:
                currency === "USD"
                  ? -amount
                  : -Number((amount / exchangeRate).toFixed(1)),
              amountUSD:
                currency === "USD"
                  ? -amount
                  : -Number((amount / exchangeRate).toFixed(1)),
              amountSYP: currency === "SYP" ? -amount : 0,
              amountOriginal: -amount,
              note,
              currency,
              paymentCurrency: currency as "USD" | "SYP",
              exchangeRate,
              amount_base: -amount,
              type: "expense",
              paymentAccountId,
              expenseAccountId,
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

          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full mt-6">
              <SelectValue placeholder="العملة المدفوع بها" />
            </SelectTrigger>
            <SelectContent>
              {["SYP", "USD"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FormInput
            id="exchangeRate"
            label="سعر الصرف"
            value={currency === "USD" ? 1 : exchangeRate}
            onChange={(e) => setExchangeRate(Number(e.target.value))}
            disabled={currency === "USD"}
          />

          <AccountSelect
            label="حساب الدفع"
            value={paymentAccountId}
            onChange={setPaymentAccountId}
            filterType="payment"
          />

          <AccountSelect
            label="حساب المصروف"
            value={expenseAccountId}
            onChange={setExpenseAccountId}
            filterType="expense"
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
