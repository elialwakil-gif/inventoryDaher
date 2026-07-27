import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteSellById, getAllSellById, updateSellById } from "@/services/sells";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Trash2, Save, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ConfirmForm from "@/components/ui/custom/ConfirmForm";
import { PDFDownloadLink } from "@react-pdf/renderer";
import PdfDocument from "@/components/pdf/PdfDocument";
import InvoicePdf from "@/components/pdf/InvoicePdf";
import CustomerDiscountForm from "@/components/Customers/CustomerDiscountForm";
import { toast } from "sonner";
import {
  formatExchangeRate,
  formatMoney as formatCurrencyAmount,
  shouldShowExchangeRate,
} from "@/lib/money";

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const formatDualCurrency = (usd: unknown, syp?: unknown) => {
  const usdText = formatCurrencyAmount(toNumber(usd), "USD");
  const sypAmount = toNumber(syp);

  return sypAmount ? `${usdText} / ${formatCurrencyAmount(sypAmount, "SYP")}` : usdText;
};

export default function SellDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const id = typeof location.state === "string" ? location.state : "";
  const queryClient = useQueryClient();

  const { data: sell, isLoading } = useQuery({
    queryKey: ["sell-details", id],
    queryFn: () => getAllSellById(id),
    enabled: !!id,
  });

  const [products, setProducts] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [isDiscountFormOpen, setIsDiscountFormOpen] = useState(false);

  // بمجرد تحميل البيانات، خزّن المنتجات في state المحلي
  if (!isLoading && sell && products.length === 0) {
    setProducts(sell.products);
  }

  const updateSellMutation = useMutation({
    mutationFn: (data: any) => {
      if (!id) throw new Error("Sell id is required");
      return updateSellById(id, data);
    },
    onSuccess: () => {
      toast.success("تم تحديث الفاتورة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["customer-details", sell.customerId] });
      navigate(-1);
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء تحديث الفاتورة");
    }
  });
  
  const deleteSellMutation = useMutation({
    mutationFn: (data: any) => {
      if (!id) throw new Error("Sell id is required");
      return deleteSellById(id, data);
    },
    onSuccess: () => {
      toast.success("تم حذف الفاتورة بنجاح");
      queryClient.invalidateQueries({
        queryKey: ["customer-details", sell.customerId],
      });
      navigate(-1);
    },
    onError: (error) => {
      console.error(error);
      toast.error("حدث خطأ أثناء حذف الفاتورة");
    }
  });
    
  const handleDoubleClick = (rowIndex: number, field: string) => {
    setEditingCell({ row: rowIndex, field });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    const updated = [...products];
    updated[rowIndex][field] = e.target.value;
    setProducts(updated);
  };

  const handleBlur = () => setEditingCell(null);

  const handleDelete = (rowIndex: number) => {
    setProducts(products.filter((_, i) => i !== rowIndex));
  };

  const handleSaveChanges = () => {
    updateSellMutation.mutate({
      id: sell.id,
      data: {products, balance: sell.totalPrice - products.reduce((acc, p) => acc + (p.sellPrice * p.qty), 0) },
    });
  };

  if (!id) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center" dir="rtl">
          <Card className="w-full p-6">
            <CardTitle className="mb-3">تعذر فتح تفاصيل الفاتورة</CardTitle>
            <p className="mb-4 text-sm text-muted-foreground">
              يرجى اختيار الفاتورة من صفحة الزبون حتى يتم تحميل بياناتها بشكل صحيح.
            </p>
            <Button onClick={() => navigate("/customers")} variant="outline">
              <ArrowLeft className="ml-2 h-4 w-4" />
              الرجوع إلى الزبائن
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!sell) {
    return (
      <DashboardLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center" dir="rtl">
          <Card className="w-full p-6">
            <CardTitle className="mb-3">لم يتم العثور على الفاتورة</CardTitle>
            <p className="mb-4 text-sm text-muted-foreground">
              قد تكون الفاتورة محذوفة أو غير متاحة حاليا.
            </p>
            <Button onClick={() => navigate("/customers")} variant="outline">
              <ArrowLeft className="ml-2 h-4 w-4" />
              الرجوع إلى الزبائن
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const productsLineSubtotal = products.reduce(
    (sum, product) =>
      sum + toNumber(product?.sellPrice) * toNumber(product?.qty),
    0,
  );
  const productsSubtotal = toNumber(sell?.subtotalUSD, productsLineSubtotal) || productsLineSubtotal;
  const savedDiscount = toNumber(sell?.discountUSD ?? sell?.discount);
  const inferredDiscount = Math.max(
    productsSubtotal - toNumber(sell?.totalPrice),
    0,
  );
  const invoiceDiscount =
    savedDiscount > 0 ? savedDiscount : inferredDiscount;
  const invoiceDiscountPercent = toNumber(sell?.discountPercent);
  const invoiceDiscountAmountUSD = toNumber(sell?.discountAmountUSD);
  const invoiceDiscountDetails = [
    invoiceDiscountPercent > 0 ? `${invoiceDiscountPercent.toLocaleString()}%` : "",
    invoiceDiscountAmountUSD > 0 ? invoiceDiscountAmountUSD.toLocaleString() : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const invoiceTotal = toNumber(sell?.totalUSD ?? sell?.totalPrice);
  const invoicePaid = toNumber(
    sell?.paidUSD ?? Math.max(invoiceTotal - toNumber(sell?.remainingDebt), 0),
  );
  const invoiceRemaining = toNumber(sell?.remainingUSD ?? sell?.remainingDebt);
  const invoiceCurrency = sell?.paymentCurrency || sell?.currency || "USD";
  const showExchangeRate = shouldShowExchangeRate({
    currency: invoiceCurrency,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader className="flex justify-between flex-row items-center gap-4">
            <CardTitle className="text-2xl font-semibold">
              اجراءات الفاتورة
            </CardTitle>
            <Button
              onClick={() => navigate(-1)}
              className="w-24"
              variant="outline"
            >
              <ArrowLeft className="" /> رجوع
            </Button>
          </CardHeader>

          <CardContent className="space-y-2">
            
            <div 
              className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4"
            >

            <CustomerDiscountForm
              isOpen={isDiscountFormOpen}
              setIsOpen={setIsDiscountFormOpen}
              customerId={sell.customerId}
              sellId={sell.id}
            />


            <Button className="w-full">
              <PDFDownloadLink
                document={
                  <PdfDocument>
                    <InvoicePdf
                      sell={{ ...sell, products, discount: invoiceDiscount }}
                    />
                  </PdfDocument>
                }
                fileName={`فاتورة_${sell.customerName}_${sell.date}.pdf`}
                >
                {({ loading }) =>
                  loading ? (
                    "جاري إنشاء الفاتورة..."
                  ) : (
                    <div className="flex items-center justify-center">
                      <FileText className="w-4 h-4 ml-2" />
                      تصدير الفاتورة PDF
                    </div>
                  )
                }
              </PDFDownloadLink>
            </Button>

            <ConfirmForm
              title="حذف الفاتورة"
              description="هل أنت متأكد؟ سيتم حذف الفاتورة وتعديل الرصيد ولا يمكن التراجع."
              confirmText="نعم، احذف الفاتورة"
              loading={deleteSellMutation.isPending}
              onConfirm={() =>
                deleteSellMutation.mutate({
                  id: sell.id,
                  data: {
                    products,
                    balance:
                    sell.totalPrice -
                    products.reduce((acc, p) => acc + p.sellPrice * p.qty, 0),
                  },
                })
              }
              trigger={
                <Button
                variant="destructive"
                className="w-full"
                disabled={deleteSellMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  حذف الفاتورة
                </Button>
              }
              />
              </div>
          </CardContent>
        </Card>

        {/* 🧾 رأس الفاتورة */}
        <Card className="shadow-md">
          <CardHeader className="flex justify-between items-center gap-4">
            <CardTitle className="text-2xl font-semibold">
              تفاصيل الفاتورة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2">
              <div>
                <span className="text-muted-foreground">اسم الزبون:</span>
                <p className="font-medium">{sell.customerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">تاريخ العملية:</span>
                <p>{sell.date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">العملة:</span>
                <p>{invoiceCurrency || "غير محددة"}</p>
              </div>
              {showExchangeRate && (
                <div>
                  <span className="text-muted-foreground">سعر الصرف:</span>
                  <p>{formatExchangeRate(sell?.exchangeRate)}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">حالة الدفع:</span>
                <Badge
                  variant={
                    sell.paymentStatus === "cash"
                      ? "default"
                      : sell.paymentStatus === "part"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {sell.paymentStatus === "cash"
                    ? "مدفوع"
                    : sell.paymentStatus === "part"
                      ? "مدفوع جزئياً"
                      : "دين"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📦 جدول المنتجات */}
        <Card className="shadow-md">
          <CardHeader className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">
              المنتجات المباعة
            </CardTitle>
            <Button
              variant="outline"
              onClick={handleSaveChanges}
              disabled={updateSellMutation.isPending}
            >
              {updateSellMutation.isPending ? (
                "جاري الحفظ..."
              ) : (
                <>
                  <Save className="ml-2 w-4 h-4" /> حفظ التعديلات
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">السعر</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-center">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-right">
                      {p.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.code || "-"}
                    </TableCell>
                    {["sellPrice", "qty"].map((field) => (
                      <TableCell
                        key={field}
                        onDoubleClick={() => handleDoubleClick(idx, field)}
                        className="cursor-pointer"
                      >
                        {editingCell?.row === idx &&
                        editingCell?.field === field ? (
                          <input
                            autoFocus
                            type={
                              field === "qty" || field === "sellPrice"
                                ? "number"
                                : "text"
                            }
                            value={p[field]}
                            onChange={(e) => handleChange(e, idx, field)}
                            onBlur={handleBlur}
                            className="w-full border rounded px-1 text-right"
                          />
                        ) : (
                          p[field]
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {(p.sellPrice * p.qty).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 💰 ملخص الفاتورة */}
        <Card className="shadow-md">
          <CardContent className="space-y-2 pt-4">
            <div className="flex justify-between">
              <span>المجموع:</span>
              <span className="font-medium">
                {productsSubtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>الحسم:</span>
              <span className="font-medium">
                {invoiceDiscount.toLocaleString()}{" "}
                {invoiceDiscountDetails ? `(${invoiceDiscountDetails})` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span>المدفوع:</span>
              <span className="font-medium">
                {formatDualCurrency(invoicePaid, sell?.paidSYP)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span></span>
              <span
                className={
                  invoiceRemaining > 0 ? "text-red-600" : "text-green-600"
                }
              >
                {formatDualCurrency(invoiceRemaining, sell?.remainingSYP)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
