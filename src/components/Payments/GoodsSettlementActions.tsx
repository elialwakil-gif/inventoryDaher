import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import GoodsSettlementPDF from "@/components/pdf/GoodsSettlementPDF";
import PdfDocument from "@/components/pdf/PdfDocument";
import { goodsPaymentLabel } from "@/lib/goodsSettlements";
import { formatMoney } from "@/lib/money";
import type { Payment } from "@/services/payments";
import {
  newSettlementRequestId,
  reverseGoodsSettlement,
} from "@/services/goodsSettlements";
import { refreshGoodsSettlementQueries } from "./GoodsSettlementForm";

export default function GoodsSettlementActions({
  payment,
  partyName,
}: {
  payment: Payment;
  partyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [outcomeUncertain, setOutcomeUncertain] = useState(false);
  const submitted = useRef<{ requestId: string; note: string }>();
  const queryClient = useQueryClient();
  const isAdmin = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("InventoryUser") || "null")?.role ===
        "admin"
      );
    } catch {
      return false;
    }
  }, []);
  const reverse = useMutation({
    mutationFn: reverseGoodsSettlement,
    onSuccess: () => {
      toast.success("تم إلغاء التسوية بسند عكسي وإعادة أثر الحساب والمخزون");
      setOpen(false);
      setCancelOpen(false);
      setNote("");
      submitted.current = undefined;
      setOutcomeUncertain(false);
      refreshGoodsSettlementQueries(queryClient);
    },
    onError: (error) => {
      if (!(error as Error & { outcomeUncertain?: boolean }).outcomeUncertain) {
        submitted.current = undefined;
        setOutcomeUncertain(false);
      }
      toast.error(error.message);
    },
  });
  if (payment.settlementMethod !== "goods") return null;
  const currency = payment.paymentCurrency || payment.currency;
  const canReverse =
    isAdmin &&
    payment.id &&
    payment.status !== "reversed" &&
    !payment.reversedBy &&
    !payment.reversalOf;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!reverse.isPending) {
          setOpen(value);
          if (!value) setCancelOpen(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => event.stopPropagation()}
        >
          سند البضاعة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{goodsPaymentLabel(payment)}</DialogTitle>
          <DialogDescription>
            {partyName} · السند {payment.id}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          المستودع: {payment.warehouse} · التاريخ:{" "}
          {payment.date ? new Date(payment.date).toLocaleString("ar-SY") : "-"}
        </p>
        {(payment.sellId || payment.purchaseId) && (
          <p className="text-sm">
            الفاتورة: {payment.sellId || payment.purchaseId}
          </p>
        )}
        {payment.reversalOf && (
          <p className="text-sm">سند عكس للعملية: {payment.reversalOf}</p>
        )}
        {payment.reversedBy && (
          <p className="text-sm text-destructive">
            أُلغيت العملية بالسند: {payment.reversedBy}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-right">الصنف</th>
                <th className="p-2">الكمية</th>
                <th className="p-2">السعر المتفق عليه</th>
                <th className="p-2">الإجمالي</th>
                <th className="p-2">المخزون قبل ← بعد</th>
              </tr>
            </thead>
            <tbody>
              {(payment.goodsItems || []).map((item) => (
                <tr key={item.productId} className="border-b">
                  <td className="p-2">
                    {item.name} · {item.code}
                  </td>
                  <td className="p-2">
                    {item.quantity} {item.unit || ""}
                  </td>
                  <td className="p-2">
                    {formatMoney(item.settlementPrice, currency)}
                  </td>
                  <td className="p-2">
                    {formatMoney(item.lineTotalOriginal, currency)}
                  </td>
                  <td className="p-2">
                    {item.quantityBefore} ← {item.quantityAfter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="font-bold">
          قيمة التسوية:{" "}
          {formatMoney(
            Math.abs(payment.amountOriginal ?? payment.amount_base),
            currency,
          )}{" "}
          / {formatMoney(Math.abs(payment.amountUSD ?? payment.amount), "USD")}
        </p>
        {currency === "SYP" && (
          <p className="text-sm">
            سعر الصرف: {payment.exchangeRate} SYP لكل USD
          </p>
        )}
        <p className="text-sm">
          أثر الرصيد:{" "}
          {formatMoney(
            payment.balanceUSDChange ?? payment.amountUSD ?? payment.amount,
            "USD",
          )}
        </p>
        <p className="text-sm">{payment.note || "لا توجد ملاحظات"}</p>
        <PDFDownloadLink
          document={
            <PdfDocument>
              <GoodsSettlementPDF payment={payment} partyName={partyName} />
            </PdfDocument>
          }
          fileName={`goods-settlement-${payment.id}.pdf`}
          className="inline-flex min-h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          {({ loading }) =>
            loading ? "جاري إنشاء السند…" : "تحميل سند البضاعة PDF"
          }
        </PDFDownloadLink>
        {canReverse && !cancelOpen && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setCancelOpen(true)}
          >
            إلغاء التسوية بسند عكسي
          </Button>
        )}
        {canReverse && cancelOpen && (
          <div className="space-y-3 rounded-md border border-destructive p-3">
            <p className="text-sm">
              يُنشأ سند يعكس حركة البضاعة وأثر الرصيد والفاتورة مع حفظ السند
              الأصلي. إذا لم تكفِ الكمية المتاحة لعكس استلام البضاعة فسيتوقف
              الإلغاء.
            </p>
            <Label htmlFor={`reverse-note-${payment.id}`}>سبب الإلغاء</Label>
            <Textarea
              id={`reverse-note-${payment.id}`}
              value={note}
              disabled={reverse.isPending || outcomeUncertain}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              type="button"
              variant="destructive"
              loading={reverse.isPending}
              disabled={reverse.isPending || !note.trim()}
              onClick={() => {
                submitted.current ||= {
                  requestId: newSettlementRequestId(),
                  note: note.trim(),
                };
                setOutcomeUncertain(true);
                reverse.mutate({
                  id: payment.id!,
                  ...submitted.current,
                });
              }}
            >
              {outcomeUncertain && !reverse.isPending
                ? "إعادة إرسال سند العكس نفسه"
                : "تأكيد إلغاء التسوية"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
