import AddCustomerForm from "@/components/Customers/AddCustomerForm";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import PdfDocument from "@/components/pdf/PdfDocument";
import QuotationPdf from "@/components/pdf/QuotationPdf";
import ProductsTable from "@/components/sellProduct/ProductsTable";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormInput from "@/components/ui/custom/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import getAllCustomer from "@/services/customer";
import getAllProducts from "@/services/products";
import {
  createQuotation,
  deleteQuotation,
  getAllQuotations,
  Quotation,
  quotationStatusLabels,
  QuotationStatus,
  updateQuotation,
} from "@/services/quotations";
import type { Product, ProductPriceType } from "@/services/transaction";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, RotateCcw, Save, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SelectedProduct = Product & { qty: number; selectedPriceType?: ProductPriceType };

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatAmount = (value: unknown) =>
  toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const createDefaultValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const createEmptyQuotationForm = () => ({
  customerId: "",
  temporaryCustomerName: "",
  products: [] as SelectedProduct[],
  discount: "",
  discountPercent: "",
  currency: "USD",
  exchangeRate: 1,
  status: "draft" as QuotationStatus,
  validUntil: createDefaultValidUntil(),
  note: "",
});

export default function Quotations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(
    null,
  );
  const [form, setForm] = useState(createEmptyQuotationForm);

  const { data: products = [] } = useQuery({
    queryKey: ["products-table"],
    queryFn: getAllProducts,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-table"],
    queryFn: getAllCustomer,
  });

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ["quotations-table"],
    queryFn: getAllQuotations,
  });

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer: any) => String(customer.id) === String(form.customerId),
      ),
    [customers, form.customerId],
  );

  const subtotal = useMemo(
    () =>
      form.products.reduce(
        (sum, product) =>
          sum + toNumber(product.sellPrice) * toNumber(product.qty),
        0,
      ),
    [form.products],
  );
  const discountAmount = Math.max(toNumber(form.discount), 0);
  const discountPercent = Math.max(toNumber(form.discountPercent), 0);
  const discountPercentUSD = Number(
    (subtotal * (discountPercent / 100)).toFixed(3),
  );
  const discount = Number((discountPercentUSD + discountAmount).toFixed(3));
  const totalPrice = Math.max(Number((subtotal - discount).toFixed(3)), 0);
  const customerName =
    selectedCustomer?.name || form.temporaryCustomerName.trim();

  const currentQuotation = useMemo<Partial<Quotation>>(
    () => ({
      id: editingQuotationId || undefined,
      number: editingQuotationId ? undefined : "Q-PREVIEW",
      customerId: form.customerId || undefined,
      customerName,
      customerNumber: selectedCustomer?.number,
      products: form.products,
      subtotal,
      discount,
      discountType:
        discountPercent > 0 && discountAmount > 0
          ? "mixed"
          : discountPercent > 0
            ? "percent"
            : discountAmount > 0
              ? "amount"
              : "none",
      discountPercent,
      discountPercentUSD,
      discountAmountUSD: discountAmount,
      totalPrice,
      currency: form.currency,
      exchangeRate: form.currency === "USD" ? 1 : toNumber(form.exchangeRate),
      status: form.status,
      validUntil: form.validUntil,
      note: form.note,
      date: new Date().toISOString(),
    }),
    [
      customerName,
      discount,
      discountAmount,
      discountPercent,
      discountPercentUSD,
      editingQuotationId,
      form,
      selectedCustomer,
      subtotal,
      totalPrice,
    ],
  );

  const customerColumns = [
    { key: "id", label: "الرمز", sortable: true, hidden: true },
    { key: "name", label: "الاسم", sortable: true },
    { key: "number", label: "الرقم", sortable: true },
  ];

  const quotationColumns = [
    { key: "id", label: "المعرف", hidden: true },
    { key: "number", label: "رقم العرض", sortable: true },
    { key: "customerName", label: "الزبون", sortable: true },
    { key: "statusDisplay", label: "الحالة", sortable: true },
    { key: "totalPriceDisplay", label: "المجموع", sortable: true },
    { key: "currency", label: "العملة", sortable: true },
    { key: "validUntil", label: "صالح لغاية", sortable: true },
    { key: "date", label: "التاريخ", sortable: true },
  ];

  const quotationRows = useMemo(
    () =>
      quotations.map((quotation) => ({
        ...quotation,
        statusDisplay:
          quotationStatusLabels[quotation.status] ||
          quotationStatusLabels.draft,
        totalPriceDisplay: formatAmount(quotation.totalPrice),
      })),
    [quotations],
  );

  const resetForm = () => {
    setEditingQuotationId(null);
    setForm(createEmptyQuotationForm());
  };

  const buildPayload = () => ({
    customerId: form.customerId || undefined,
    customerName,
    customerNumber: selectedCustomer?.number || "",
    products: form.products.map((product) => ({
      ...product,
      qty: toNumber(product.qty),
      sellPrice: toNumber(product.sellPrice),
      quantity:
        product.quantity === undefined ? undefined : toNumber(product.quantity),
      payPrice:
        product.payPrice === undefined ? undefined : toNumber(product.payPrice),
    })),
    discount,
    discountPercent,
    discountPercentUSD,
    discountAmountUSD: discountAmount,
    currency: form.currency,
    exchangeRate: form.currency === "USD" ? 1 : toNumber(form.exchangeRate),
    status: form.status,
    validUntil: form.validUntil,
    note: form.note,
  });

  const validateForm = () => {
    if (!customerName) {
      toast.error("الرجاء اختيار زبون أو كتابة اسم زبون مؤقت");
      return false;
    }

    if (!form.products.length) {
      toast.error("الرجاء إضافة منتج واحد على الأقل");
      return false;
    }

    if (form.products.some((product) => toNumber(product.qty) <= 0)) {
      toast.error("كل الكميات يجب أن تكون أكبر من صفر");
      return false;
    }

    if (form.products.some((product) => toNumber(product.sellPrice) <= 0)) {
      toast.error("كل الأسعار يجب أن تكون أكبر من صفر");
      return false;
    }

    if (totalPrice <= 0) {
      toast.error("مجموع العرض يجب أن يكون أكبر من صفر");
      return false;
    }

    if (discountPercent < 0 || discountPercent > 100) {
      toast.error("نسبة الحسم يجب أن تكون بين 0 و 100");
      return false;
    }

    if (discountAmount < 0) {
      toast.error("مبلغ الحسم لا يمكن أن يكون سالبا");
      return false;
    }

    if (discount >= subtotal) {
      toast.error("الحسم يجب أن يكون أقل من مجموع العرض");
      return false;
    }

    if (form.currency !== "USD" && toNumber(form.exchangeRate) <= 0) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return false;
    }

    return true;
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editingQuotationId
        ? updateQuotation(editingQuotationId, buildPayload())
        : createQuotation(buildPayload()),
    onSuccess: (quotation) => {
      toast.success(
        editingQuotationId
          ? "تم تحديث عرض السعر بنجاح"
          : "تم حفظ عرض السعر بنجاح",
      );
      setEditingQuotationId(quotation.id || null);
      queryClient.invalidateQueries({ queryKey: ["quotations-table"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "تعذر حفظ عرض السعر",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteQuotation,
    onSuccess: () => {
      toast.success("تم حذف عرض السعر");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["quotations-table"] });
    },
    onError: () => {
      toast.error("تعذر حذف عرض السعر");
    },
  });

  const editQuotation = (quotation: Quotation) => {
    setEditingQuotationId(quotation.id || null);
    setForm({
      customerId: quotation.customerId || "",
      temporaryCustomerName: quotation.customerId
        ? ""
        : quotation.customerName || "",
      products: quotation.products as SelectedProduct[],
      discount: String((quotation.discountAmountUSD ?? quotation.discount) || ""),
      discountPercent: String(quotation.discountPercent || ""),
      currency: quotation.currency || "USD",
      exchangeRate: quotation.currency === "USD" ? 1 : quotation.exchangeRate || 1,
      status: quotation.status || "draft",
      validUntil: quotation.validUntil || createDefaultValidUntil(),
      note: quotation.note || "",
    });
  };

  const convertToSell = (quotation: Quotation) => {
    if (!quotation.customerId) {
      toast.error("لتحويل العرض إلى بيع يجب اختيار زبون محفوظ في النظام");
      editQuotation(quotation);
      return;
    }

    navigate("/sellProduct", {
      state: {
        quotation: {
          ...quotation,
          discount: String(quotation.discount || ""),
          discountAmountUSD:
            quotation.discountAmountUSD === undefined ||
            quotation.discountAmountUSD === null
              ? quotation.discount
              : quotation.discountAmountUSD,
          discountPercent: quotation.discountPercent || 0,
        },
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle>عرض سعر / فاتورة مبدئية</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <DataTable
                title="الزبائن"
                titleButton={
                  <AddCustomerForm
                    isOpen={customerModalOpen}
                    setIsOpen={setCustomerModalOpen}
                    className="mb-2 w-full"
                  />
                }
                columns={customerColumns}
                data={customers}
                defaultPageSize={5}
                onRowClick={(row) =>
                  setForm((current) => ({
                    ...current,
                    customerId:
                      String(current.customerId) === String(row.id)
                        ? ""
                        : String(row.id),
                    temporaryCustomerName: "",
                  }))
                }
                getRowClassName={(row) =>
                  String(row.id) === String(form.customerId)
                    ? "bg-green-50 hover:bg-green-100"
                    : ""
                }
              />
            </div>

            <div className="space-y-4 lg:col-span-2">
              <FormInput
                label="اسم زبون مؤقت"
                id="temporary-customer-name"
                value={form.temporaryCustomerName}
                disabled={Boolean(form.customerId)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    temporaryCustomerName: event.target.value,
                  }))
                }
                placeholder="استخدمه عند عدم وجود الزبون في النظام"
              />

              <ProductsTable
                products={products}
                selectedProducts={form.products}
                enforceStock={false}
                onChange={(selectedProducts) =>
                  setForm((current) => ({
                    ...current,
                    products: selectedProducts,
                  }))
                }
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <FormInput
                  label="حسم نسبة %"
                  id="quotation-discount-percent"
                  type="number"
                  value={form.discountPercent}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discountPercent: event.target.value,
                    }))
                  }
                />

                <FormInput
                  label="حسم مبلغ"
                  id="quotation-discount"
                  type="number"
                  value={form.discount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount: event.target.value,
                    }))
                  }
                />

                <FormInput
                  label="صالح لغاية"
                  id="quotation-valid-until"
                  type="date"
                  value={form.validUntil}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validUntil: event.target.value,
                    }))
                  }
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">الحالة</label>
                  <Select
                    value={form.status}
                    onValueChange={(status) =>
                      setForm((current) => ({
                        ...current,
                        status: status as QuotationStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(quotationStatusLabels).map(
                        ([status, label]) => (
                          <SelectItem key={status} value={status}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">العملة</label>
                  <Select
                    value={form.currency}
                    onValueChange={(currency) =>
                      setForm((current) => ({
                        ...current,
                        currency,
                        exchangeRate: currency === "USD" ? 1 : current.exchangeRate,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="SYP">SYP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <FormInput
                  label="سعر الصرف"
                  id="quotation-exchange-rate"
                  type="number"
                  value={form.currency === "USD" ? 1 : form.exchangeRate}
                  disabled={form.currency === "USD"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      exchangeRate: Number(event.target.value),
                    }))
                  }
                />

                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">
                    المجموع النهائي
                  </p>
                  <p className="text-2xl font-bold">
                    {formatAmount(totalPrice)}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">ملاحظات</label>
                <Textarea
                  value={form.note}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="مثال: السعر صالح لمدة محددة أو لا يشمل التركيب"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <Button
                  type="button"
                  variant="accent"
                  className="md:col-span-2"
                  disabled={saveMutation.isPending}
                  loading={saveMutation.isPending}
                  onClick={() => {
                    if (!validateForm()) return;
                    saveMutation.mutate();
                  }}
                >
                  <Save className="h-4 w-4" />
                  {editingQuotationId ? "تحديث العرض" : "حفظ عرض السعر"}
                </Button>

                <PDFDownloadLink
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full",
                  )}
                  document={
                    <PdfDocument>
                      <QuotationPdf quotation={currentQuotation} />
                    </PdfDocument>
                  }
                  fileName={`عرض_سعر_${customerName || "زبون"}.pdf`}
                >
                  {({ loading }) => (
                    <>
                      <FileText className="h-4 w-4" />
                      {loading ? "جاري التجهيز" : "تصدير PDF"}
                    </>
                  )}
                </PDFDownloadLink>

                <Button type="button" variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4" />
                  جديد
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <DataTable
          title="عروض الأسعار المحفوظة"
          columns={quotationColumns}
          data={quotationRows}
          isLoading={isLoading}
          renderRowActions={(row) => (
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => editQuotation(row as Quotation)}
              >
                تعديل
              </Button>

              <PDFDownloadLink
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9",
                )}
                document={
                  <PdfDocument>
                    <QuotationPdf quotation={row as Quotation} />
                  </PdfDocument>
                }
                fileName={`عرض_سعر_${row.number}.pdf`}
              >
                {({ loading }) => (loading ? "PDF" : "PDF")}
              </PDFDownloadLink>

              <Button
                type="button"
                size="sm"
                variant="accent"
                disabled={row.status === "converted"}
                onClick={() => convertToSell(row as Quotation)}
              >
                <ShoppingCart className="h-4 w-4" />
                تحويل
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!window.confirm("هل تريد حذف عرض السعر؟")) return;
                  deleteMutation.mutate(row.id);
                }}
              >
                حذف
              </Button>
            </div>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
