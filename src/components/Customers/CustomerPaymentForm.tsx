import React, { useEffect, useState } from "react";
import AccountSelect from "../Accounts/AccountSelect";
import PopupForm from "../ui/custom/PopupForm";
import { Button } from "../ui/button";
import FormInput from "../ui/custom/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { payCustomerDebt } from "@/services/transaction";
import { toast } from "sonner";

export default function CustomerPaymentForm({
  isOpen,
  setIsOpen,
  customerData,
}) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [receivableAccountId, setReceivableAccountId] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!customerData) return;
    setPaymentAccountId(customerData.defaultPaymentAccountId || "");
    setReceivableAccountId(customerData.defaultReceivableAccountId || "");
  }, [customerData]);

  const payCustomerDebtMutation = useMutation({
    mutationFn: (dataToSend: any) => payCustomerDebt(dataToSend as any),
    onSuccess: () => {
      toast.success("تم إضافة الدفعة بنجاح!");
      setAmount(0);
      setNote("");
      setCurrency("");
      setExchangeRate(1);
      setPaymentAccountId(customerData?.defaultPaymentAccountId || "");
      setReceivableAccountId(customerData?.defaultReceivableAccountId || "");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer-details"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء إضافة الدفعة");
    },
  });

  return (
    <PopupForm
      title="اضافة دفعة"
      trigger={
        <Button
          onClick={(e) => {
            setIsOpen(true);
            e.stopPropagation();
          }}
          variant="accent"
          size="sm"
          className="w-full"
        >
          اضافة دفعة من الزبون
        </Button>
      }
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    >
      <form
        className="space-y-4 mt-4"
        onSubmit={(e) => {
          e.preventDefault();

          if (!paymentAccountId || !receivableAccountId) {
            toast.error("الرجاء اختيار حساب القبض وحساب العملاء");
            return;
          }

          payCustomerDebtMutation.mutate({
            customerId: customerData.id,
            amount:
              currency === "USD"
                ? amount
                : Number((amount / exchangeRate).toFixed(1)),
            amountUSD:
              currency === "USD"
                ? amount
                : Number((amount / exchangeRate).toFixed(1)),
            amountSYP: currency === "SYP" ? amount : 0,
            amountOriginal: amount,
            note,
            currency,
            paymentCurrency: currency as "USD" | "SYP",
            exchangeRate,
            amount_base: amount,
            paymentAccountId,
            receivableAccountId,
          });
        }}
      >
        <FormInput
          label="قيمة الدفعة"
          id="payment-amount"
          type="number"
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
            {["SYP", "USD"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
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
          label="حساب القبض"
          value={paymentAccountId}
          onChange={setPaymentAccountId}
          filterType="payment"
        />

        <AccountSelect
          label="حساب العملاء"
          value={receivableAccountId}
          onChange={setReceivableAccountId}
          filterType="receivable"
        />

        <Button
          className="w-full"
          type="submit"
          disabled={payCustomerDebtMutation.isPending}
          loading={payCustomerDebtMutation.isPending}
        >
          اضافة دفعة
        </Button>
      </form>
    </PopupForm>
  );
}
