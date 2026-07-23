import AccountSelect from "@/components/Accounts/AccountSelect";
import AddCustomerForm from "@/components/Customers/AddCustomerForm";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import ProductsTable from "@/components/sellProduct/ProductsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormInput from "@/components/ui/custom/FormInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import getAllCustomer from "@/services/customer";
import type { Product, sell } from "@/services/transaction";
import { createMyVehicleSale, getMyVehicle } from "@/services/vehicles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SelectedProduct = Product & { qty: number };
type PaymentStatus = "cash" | "part" | "debt";

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const formatNumber = (value: unknown) =>
  toNumber(value).toLocaleString("en-US", { maximumFractionDigits: 3 });

const formatMoney = (value: unknown) =>
  toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

export default function DriverSales() {
  const queryClient = useQueryClient();
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [discount, setDiscount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("cash");
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [partValue, setPartValue] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [receivableAccountId, setReceivableAccountId] = useState("");

  const {
    data: vehicleSummary,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["driver-vehicle"],
    queryFn: () => getMyVehicle(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-table"],
    queryFn: getAllCustomer,
  });

  const products = vehicleSummary?.products || [];
  const vehicle = vehicleSummary?.vehicle;

  useEffect(() => {
    if (!vehicle) return;

    setSalesAccountId((current) => current || vehicle.defaultSalesAccountId || "");
    setPaymentAccountId(
      (current) => current || vehicle.defaultPaymentAccountId || "",
    );
    setReceivableAccountId(
      (current) => current || vehicle.defaultReceivableAccountId || "",
    );
  }, [vehicle]);

  const subtotal = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + toNumber(product.qty) * toNumber(product.sellPrice),
        0,
      ),
    [selectedProducts],
  );

  const totalPrice = useMemo(
    () => Math.max(Number((subtotal - toNumber(discount)).toFixed(3)), 0),
    [discount, subtotal],
  );

  const resetInvoice = () => {
    setCustomerId("");
    setSelectedProducts([]);
    setDiscount("");
    setPaymentStatus("cash");
    setCurrency("USD");
    setExchangeRate(1);
    setPartValue("");
  };

  const saleMutation = useMutation({
    mutationFn: createMyVehicleSale,
    onSuccess: async () => {
      toast.success("تم تسجيل البيع من السيارة");
      resetInvoice();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["driver-vehicle"] }),
        queryClient.invalidateQueries({ queryKey: ["vehicles-table"] }),
        queryClient.invalidateQueries({ queryKey: ["products-table"] }),
        queryClient.invalidateQueries({ queryKey: ["sells-table"] }),
      ]);
    },
    onError: (saleError) => toast.error((saleError as Error).message),
  });

  const validateSale = () => {
    if (!customerId) {
      toast.error("اختر الزبون");
      return false;
    }

    if (!selectedProducts.length) {
      toast.error("أضف منتجاً واحداً على الأقل");
      return false;
    }

    if (
      selectedProducts.some(
        (product) => toNumber(product.qty) <= 0 || toNumber(product.sellPrice) <= 0,
      )
    ) {
      toast.error("تأكد من الكميات والأسعار");
      return false;
    }

    if (totalPrice <= 0) {
      toast.error("قيمة الفاتورة يجب أن تكون أكبر من صفر");
      return false;
    }

    if (!salesAccountId) {
      toast.error("اختر حساب المبيعات");
      return false;
    }

    if ((paymentStatus === "cash" || paymentStatus === "part") && !paymentAccountId) {
      toast.error("اختر حساب القبض");
      return false;
    }

    if (
      (paymentStatus === "debt" || paymentStatus === "part") &&
      !receivableAccountId
    ) {
      toast.error("اختر حساب العملاء");
      return false;
    }

    if (currency !== "USD" && toNumber(exchangeRate) <= 0) {
      toast.error("أدخل سعر صرف صحيح");
      return false;
    }

    const paidAmount =
      paymentStatus === "part"
        ? currency === "USD"
          ? toNumber(partValue)
          : toNumber(partValue) / toNumber(exchangeRate)
        : totalPrice;

    if (paymentStatus === "part" && (paidAmount <= 0 || paidAmount >= totalPrice)) {
      toast.error("الدفعة الجزئية يجب أن تكون أكبر من صفر وأقل من الإجمالي");
      return false;
    }

    return true;
  };

  const submitSale = () => {
    if (!validateSale()) return;

    const saleExchangeRate = currency === "USD" ? 1 : toNumber(exchangeRate);
    const paidAmount =
      paymentStatus === "cash"
        ? totalPrice
        : paymentStatus === "part"
        ? currency === "USD"
          ? toNumber(partValue)
          : Number((toNumber(partValue) / saleExchangeRate).toFixed(3))
        : 0;

    const newSell: sell = {
      customerId,
      products: selectedProducts.map((product) => ({
        ...product,
        warehouse: vehicle?.name || product.warehouse,
        qty: toNumber(product.qty),
        quantity: toNumber(product.quantity),
        sellPrice: toNumber(product.sellPrice),
        payPrice: toNumber(product.payPrice),
      })),
      totalPrice,
      paymentStatus,
      remainingDebt: paymentStatus === "cash" ? 0 : totalPrice - paidAmount,
      paymentAccountId: paymentStatus === "debt" ? undefined : paymentAccountId,
      receivableAccountId:
        paymentStatus === "cash" ? undefined : receivableAccountId,
      salesAccountId,
      currency,
      exchangeRate: saleExchangeRate,
      amount_base: totalPrice * saleExchangeRate,
      partValue: toNumber(partValue),
      discount: toNumber(discount),
      vehicleId: vehicle?.id,
      vehicleName: vehicle?.name,
      sourceWarehouse: vehicle?.name,
    };

    saleMutation.mutate(newSell);
  };

  const customerRows = customers.map((customer: any) => ({
    id: customer.id,
    name: customer.name,
    number: customer.number,
  }));

  const todaySalesRows = (vehicleSummary?.sales || []).map((sale) => ({
    id: sale.id,
    customerId: sale.customerId,
    paymentStatus: sale.paymentStatus,
    totalPrice: formatMoney(sale.totalPrice),
    date: sale.date || "",
  }));

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Truck className="h-5 w-5" />
                  مبيعات السيارة
                </CardTitle>
                {vehicle && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{vehicle.name}</Badge>
                    {vehicle.plateNumber && <Badge variant="secondary">{vehicle.plateNumber}</Badge>}
                    <Badge variant="outline">
                      الكمية: {formatNumber(vehicleSummary?.totals.totalQuantity)}
                    </Badge>
                    <Badge variant="outline">
                      مبيعات اليوم: {formatMoney(vehicleSummary?.totals.salesTotal)}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["driver-vehicle"] })
                }
              >
                <RefreshCw className="h-4 w-4" />
                تحديث
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoading && <p className="text-muted-foreground">جاري تحميل بيانات السيارة...</p>}
            {isError && (
              <p className="text-destructive">
                {(error as Error)?.message || "لم يتم ربط هذا المستخدم بسيارة"}
              </p>
            )}
            {!isLoading && !isError && vehicle && (
              <div className="grid gap-4 lg:grid-cols-3">
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
                    columns={[
                      { key: "id", label: "المعرف", hidden: true },
                      { key: "name", label: "الاسم", sortable: true },
                      { key: "number", label: "الرقم", sortable: true },
                    ]}
                    data={customerRows}
                    defaultPageSize={5}
                    onRowClick={(row) => setCustomerId(row.id)}
                    getRowClassName={(row) =>
                      String(row.id) === String(customerId)
                        ? "bg-green-50 hover:bg-green-100"
                        : ""
                    }
                  />
                </div>

                <div className="lg:col-span-2">
                  <ProductsTable
                    products={products}
                    selectedProducts={selectedProducts}
                    onChange={setSelectedProducts}
                    enforceStock
                  />
                </div>

                <form className="grid grid-cols-1 gap-3 lg:col-span-3 md:grid-cols-2">
                  <FormInput
                    label="الحسم"
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                  <FormInput
                    label="الإجمالي النهائي"
                    value={formatMoney(totalPrice)}
                    disabled
                    onChange={() => {}}
                  />

                  <div className="grid grid-cols-3 gap-2 md:col-span-2">
                    {(["cash", "part", "debt"] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={paymentStatus === status ? "default" : "outline"}
                        onClick={() => setPaymentStatus(status)}
                      >
                        {status === "cash"
                          ? "نقداً"
                          : status === "part"
                          ? "جزئي"
                          : "دين"}
                      </Button>
                    ))}
                  </div>

                  {paymentStatus === "part" && (
                    <FormInput
                      label="قيمة الدفعة"
                      type="number"
                      min={0}
                      value={partValue}
                      onChange={(event) => setPartValue(event.target.value)}
                    />
                  )}

                  {paymentStatus !== "debt" && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          العملة
                        </label>
                        <Select
                          value={currency}
                          onValueChange={(nextCurrency) => {
                            setCurrency(nextCurrency);
                            setExchangeRate(nextCurrency === "USD" ? 1 : exchangeRate);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="العملة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="SYP">SYP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormInput
                        label="سعر الصرف"
                        type="number"
                        value={currency === "USD" ? 1 : exchangeRate}
                        disabled={currency === "USD"}
                        onChange={(event) =>
                          setExchangeRate(toNumber(event.target.value))
                        }
                      />
                    </>
                  )}

                  <AccountSelect
                    label="حساب المبيعات"
                    value={salesAccountId}
                    onChange={setSalesAccountId}
                    filterType="sales"
                  />
                  {(paymentStatus === "cash" || paymentStatus === "part") && (
                    <AccountSelect
                      label="حساب القبض"
                      value={paymentAccountId}
                      onChange={setPaymentAccountId}
                      filterType="payment"
                    />
                  )}
                  {(paymentStatus === "debt" || paymentStatus === "part") && (
                    <AccountSelect
                      label="حساب العملاء"
                      value={receivableAccountId}
                      onChange={setReceivableAccountId}
                      filterType="receivable"
                    />
                  )}

                  <Button
                    type="button"
                    className="md:col-span-2"
                    variant="accent"
                    loading={saleMutation.isPending}
                    disabled={saleMutation.isPending}
                    onClick={submitSale}
                  >
                    تسجيل البيع
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        {vehicle && (
          <DataTable
            title="مبيعاتي اليوم"
            columns={[
              { key: "id", label: "المعرف", hidden: true },
              { key: "customerId", label: "الزبون", sortable: true },
              { key: "paymentStatus", label: "الدفع", sortable: true },
              { key: "totalPrice", label: "الإجمالي", sortable: true },
              { key: "date", label: "التاريخ", sortable: true },
            ]}
            data={todaySalesRows}
            defaultPageSize={5}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
