import AccountSelect from "@/components/Accounts/AccountSelect";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmForm from "@/components/ui/custom/ConfirmForm";
import FormInput from "@/components/ui/custom/FormInput";
import PopupForm from "@/components/ui/custom/PopupForm";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import getAllCustomer from "@/services/customer";
import {
  cancelMaterialReservation,
  closeMaterialReservation,
  createMaterialReservation,
  MaterialReservation,
  getAllMaterialReservations,
} from "@/services/materialReservations";
import getAllProducts from "@/services/products";
import { Product } from "@/services/transaction";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, ClipboardList, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ReservableProduct = Product & {
  reservedQuantity?: number;
};

type SelectedReservationProduct = ReservableProduct & {
  reservedQty: number;
};

type PaymentStatus = "cash" | "part" | "debt";

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const itemKey = (productId: string, warehouse: string) =>
  `${warehouse}::${productId}`;

const formatNumber = (value: unknown) =>
  toNumber(value).toLocaleString("en-US", {
    maximumFractionDigits: 3,
  });

const getAvailableQuantity = (product: ReservableProduct) =>
  Math.max(
    toNumber(product.quantity) - toNumber(product.reservedQuantity),
    0,
  );

const statusLabel = (status: MaterialReservation["status"]) => {
  if (status === "reserved") return "مفتوح";
  if (status === "closed") return "مغلق";
  return "ملغى";
};

const statusVariant = (status: MaterialReservation["status"]) => {
  if (status === "reserved") return "secondary";
  if (status === "closed") return "default";
  return "destructive";
};

export default function MaterialReservations() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<MaterialReservation | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [note, setNote] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    SelectedReservationProduct[]
  >([]);
  const [usedQuantities, setUsedQuantities] = useState<Record<string, string>>(
    {},
  );
  const [discount, setDiscount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("cash");
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [partValue, setPartValue] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [receivableAccountId, setReceivableAccountId] = useState("");
  const [salesAccountId, setSalesAccountId] = useState("");

  const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ["material-reservations"],
    queryFn: getAllMaterialReservations,
  });

  const { data: products = [] } = useQuery<ReservableProduct[]>({
    queryKey: ["products-table"],
    queryFn: getAllProducts,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-table"],
    queryFn: getAllCustomer,
  });

  const filteredProducts = useMemo(
    () =>
      products
        .filter((product) => getAvailableQuantity(product) > 0)
        .filter((product) => {
          const search = productSearch.trim().toLowerCase();
          if (!search) return false;

          return (
            product.name?.toLowerCase().includes(search) ||
            product.code?.toLowerCase().includes(search)
          );
        })
        .slice(0, 12),
    [productSearch, products],
  );

  const closeTotalBeforeDiscount = useMemo(() => {
    if (!selectedReservation) return 0;

    return selectedReservation.items.reduce((sum, item) => {
      const usedQty = toNumber(
        usedQuantities[itemKey(item.productId, item.warehouse)],
      );

      return sum + usedQty * toNumber(item.sellPrice);
    }, 0);
  }, [selectedReservation, usedQuantities]);

  const closeDiscountPercentAmount = useMemo(
    () =>
      Number(
        (
          closeTotalBeforeDiscount *
          (Math.max(toNumber(discountPercent), 0) / 100)
        ).toFixed(3),
      ),
    [closeTotalBeforeDiscount, discountPercent],
  );
  const closeDiscountTotal = useMemo(
    () => Number((closeDiscountPercentAmount + Math.max(toNumber(discount), 0)).toFixed(3)),
    [closeDiscountPercentAmount, discount],
  );
  const closeFinalTotal = useMemo(
    () =>
      Math.max(
        Number((closeTotalBeforeDiscount - closeDiscountTotal).toFixed(3)),
        0,
      ),
    [closeDiscountTotal, closeTotalBeforeDiscount],
  );

  const resetCreateForm = () => {
    setCustomerId("");
    setTechnicianName("");
    setNote("");
    setProductSearch("");
    setSelectedProducts([]);
  };

  const resetCloseForm = () => {
    setSelectedReservation(null);
    setUsedQuantities({});
    setDiscount("");
    setDiscountPercent("");
    setPaymentStatus("cash");
    setCurrency("USD");
    setExchangeRate(1);
    setPartValue("");
    setPaymentAccountId("");
    setReceivableAccountId("");
    setSalesAccountId("");
  };

  const invalidateReservationData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["material-reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["products-table"] }),
      queryClient.invalidateQueries({ queryKey: ["sells-table"] }),
    ]);
  };

  const createReservationMutation = useMutation({
    mutationFn: createMaterialReservation,
    onSuccess: async () => {
      toast.success("تم إنشاء الحجز بنجاح");
      resetCreateForm();
      setIsCreateOpen(false);
      await invalidateReservationData();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const closeReservationMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof closeMaterialReservation>[1];
    }) => closeMaterialReservation(id, payload),
    onSuccess: async () => {
      toast.success("تم إغلاق الحجز بنجاح");
      resetCloseForm();
      setIsCloseOpen(false);
      await invalidateReservationData();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: cancelMaterialReservation,
    onSuccess: async () => {
      toast.success("تم إلغاء الحجز وتحرير الكمية");
      await invalidateReservationData();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const addProductToReservation = (product: ReservableProduct) => {
    const availableQuantity = getAvailableQuantity(product);

    if (availableQuantity <= 0) {
      toast.error("لا توجد كمية متاحة للحجز");
      return;
    }

    setSelectedProducts((current) => {
      const exists = current.some((item) => item.id === product.id);
      if (exists) return current;

      return [...current, { ...product, reservedQty: 1 }];
    });
    setProductSearch("");
  };

  const updateReservedQty = (productId: string, value: number) => {
    setSelectedProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) return product;

        const availableQuantity = getAvailableQuantity(product);
        const nextQty = Math.min(Math.max(toNumber(value), 0), availableQuantity);

        return { ...product, reservedQty: nextQty };
      }),
    );
  };

  const updateReservedPrice = (productId: string, value: number) => {
    setSelectedProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? { ...product, sellPrice: Math.max(toNumber(value), 0) }
          : product,
      ),
    );
  };

  const removeSelectedProduct = (productId: string) => {
    setSelectedProducts((current) =>
      current.filter((product) => product.id !== productId),
    );
  };

  const handleCreateReservation = () => {
    if (!customerId) {
      toast.error("الرجاء اختيار الزبون");
      return;
    }

    if (!technicianName.trim()) {
      toast.error("الرجاء إدخال اسم الفني");
      return;
    }

    if (!selectedProducts.length) {
      toast.error("الرجاء اختيار مادة واحدة على الأقل");
      return;
    }

    if (
      selectedProducts.some(
        (product) =>
          toNumber(product.reservedQty) <= 0 ||
          toNumber(product.sellPrice) <= 0 ||
          toNumber(product.reservedQty) > getAvailableQuantity(product),
      )
    ) {
      toast.error("تأكد من الكميات والأسعار قبل إنشاء الحجز");
      return;
    }

    createReservationMutation.mutate({
      customerId,
      technicianName: technicianName.trim(),
      note: note.trim() || undefined,
      items: selectedProducts.map((product) => ({
        productId: product.id,
        warehouse: product.warehouse,
        reservedQty: toNumber(product.reservedQty),
        sellPrice: toNumber(product.sellPrice),
      })),
    });
  };

  const openCloseReservation = (reservation: MaterialReservation) => {
    const nextUsedQuantities = reservation.items.reduce(
      (values, item) => ({
        ...values,
        [itemKey(item.productId, item.warehouse)]:
          item.usedQty === undefined ? "" : String(item.usedQty),
      }),
      {} as Record<string, string>,
    );

    setSelectedReservation(reservation);
    setUsedQuantities(nextUsedQuantities);
    setDiscount("");
    setDiscountPercent("");
    setPaymentStatus("cash");
    setCurrency("USD");
    setExchangeRate(1);
    setPartValue("");
    setPaymentAccountId("");
    setReceivableAccountId("");
    setSalesAccountId("");
    setIsCloseOpen(true);
  };

  const handleCloseReservation = () => {
    if (!selectedReservation) return;

    const hasMissingQuantity = selectedReservation.items.some(
      (item) =>
        usedQuantities[itemKey(item.productId, item.warehouse)] === undefined ||
        usedQuantities[itemKey(item.productId, item.warehouse)] === "",
    );

    if (hasMissingQuantity) {
      toast.error("الرجاء إدخال الكمية المستخدمة لكل مادة");
      return;
    }

    const hasInvalidQuantity = selectedReservation.items.some((item) => {
      const usedQty = toNumber(
        usedQuantities[itemKey(item.productId, item.warehouse)],
      );

      return usedQty < 0 || usedQty > item.reservedQty;
    });

    if (hasInvalidQuantity) {
      toast.error("الكمية المستخدمة يجب أن تكون بين صفر والكمية المحجوزة");
      return;
    }

    if (toNumber(discountPercent) < 0 || toNumber(discountPercent) > 100) {
      toast.error("نسبة الحسم يجب أن تكون بين 0 و 100");
      return;
    }

    if (toNumber(discount) < 0) {
      toast.error("مبلغ الحسم لا يمكن أن يكون سالبا");
      return;
    }

    if (closeDiscountTotal >= closeTotalBeforeDiscount && closeTotalBeforeDiscount > 0) {
      toast.error("الحسم يجب أن يكون أقل من المجموع");
      return;
    }

    const hasUsedProducts = closeTotalBeforeDiscount > 0;

    if (hasUsedProducts && !salesAccountId) {
      toast.error("الرجاء اختيار حساب المبيعات");
      return;
    }

    if (
      hasUsedProducts &&
      (paymentStatus === "cash" || paymentStatus === "part") &&
      !paymentAccountId
    ) {
      toast.error("الرجاء اختيار حساب القبض");
      return;
    }

    if (
      hasUsedProducts &&
      (paymentStatus === "debt" || paymentStatus === "part") &&
      !receivableAccountId
    ) {
      toast.error("الرجاء اختيار حساب العملاء");
      return;
    }

    if (hasUsedProducts && currency !== "USD" && exchangeRate <= 0) {
      toast.error("الرجاء إدخال سعر صرف صحيح");
      return;
    }

    const paidAmount =
      paymentStatus === "cash"
        ? closeFinalTotal
        : paymentStatus === "part"
        ? currency === "USD"
          ? toNumber(partValue)
          : Number((toNumber(partValue) / exchangeRate).toFixed(3))
        : 0;

    if (
      hasUsedProducts &&
      paymentStatus === "part" &&
      (paidAmount <= 0 || paidAmount >= closeFinalTotal)
    ) {
      toast.error("الدفعة الجزئية يجب أن تكون أقل من الإجمالي وأكبر من صفر");
      return;
    }

    closeReservationMutation.mutate({
      id: selectedReservation.id,
      payload: {
        items: selectedReservation.items.map((item) => ({
          productId: item.productId,
          warehouse: item.warehouse,
          usedQty: toNumber(
            usedQuantities[itemKey(item.productId, item.warehouse)],
          ),
        })),
        sell: {
          paymentStatus,
          discount: closeDiscountTotal,
          discountPercent: toNumber(discountPercent),
          discountPercentUSD: closeDiscountPercentAmount,
          discountAmountUSD: toNumber(discount),
          currency,
          exchangeRate: currency === "USD" ? 1 : exchangeRate,
          partValue: toNumber(partValue),
          paymentAccountId:
            paymentStatus === "debt" ? undefined : paymentAccountId,
          receivableAccountId:
            paymentStatus === "cash" ? undefined : receivableAccountId,
          salesAccountId,
        },
      },
    });
  };

  const reservationRows = reservations.map((reservation) => ({
    id: reservation.id,
    customerName: reservation.customerName || reservation.customerId,
    technicianName: reservation.technicianName,
    statusText: statusLabel(reservation.status),
    statusValue: reservation.status,
    itemsSummary: reservation.items
      .map((item) => `${item.name} (${formatNumber(item.reservedQty)} ${item.unit || ""})`)
      .join(", "),
    totalReservedQty: formatNumber(reservation.totalReservedQty),
    totalUsedQty:
      reservation.totalUsedQty === undefined
        ? "-"
        : formatNumber(reservation.totalUsedQty),
    totalPrice:
      reservation.totalPrice === undefined
        ? "-"
        : formatNumber(reservation.totalPrice),
    createdAt: reservation.createdAt,
    originalReservation: reservation,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        <DataTable
          title="حجوزات التركيب"
          description="حجز مواد للفنيين ثم تسوية الكمية المستخدمة عند الإرجاع."
          columns={[
            { key: "id", label: "المعرف", hidden: true },
            { key: "customerName", label: "الزبون", sortable: true },
            { key: "technicianName", label: "الفني", sortable: true },
            { key: "statusText", label: "الحالة", sortable: true },
            { key: "itemsSummary", label: "المواد", sortable: true },
            { key: "totalReservedQty", label: "المحجوز", sortable: true },
            { key: "totalUsedQty", label: "المستخدم", sortable: true },
            { key: "totalPrice", label: "الفاتورة", sortable: true },
            { key: "createdAt", label: "التاريخ", sortable: true },
            { key: "statusValue", label: "statusValue", hidden: true },
          ]}
          data={reservationRows}
          isLoading={reservationsLoading}
          titleButton={
            <PopupForm
              title="إنشاء حجز تركيب"
              isOpen={isCreateOpen}
              setIsOpen={setIsCreateOpen}
              trigger={
                <Button type="button" className="gap-2">
                  <Plus className="h-4 w-4" />
                  حجز جديد
                </Button>
              }
            >
              <div className="space-y-4" dir="rtl">
                <FormInput
                  label="الزبون"
                  value={customerId}
                  options={(customers as any[]).map((customer) => ({
                    id: String(customer.id),
                    name: customer.name,
                  }))}
                  onChange={(event) => setCustomerId(event.target.value)}
                />

                <FormInput
                  label="اسم الفني"
                  value={technicianName}
                  onChange={(event) => setTechnicianName(event.target.value)}
                />

                <FormInput
                  label="ملاحظة"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    اختيار المواد
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="ابحث باسم المادة أو الكود"
                    />
                  </div>

                  {filteredProducts.length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-md border">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b p-3 text-right text-sm last:border-b-0 hover:bg-muted"
                          onClick={() => addProductToReservation(product)}
                        >
                          <span>
                            <span className="font-medium">{product.name}</span>{" "}
                            <span className="text-muted-foreground">
                              ({product.code})
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            المتاح: {formatNumber(getAvailableQuantity(product))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="space-y-2">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_110px_110px_40px]"
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.code} | {product.warehouse} | المتاح:{" "}
                            {formatNumber(getAvailableQuantity(product))}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={getAvailableQuantity(product)}
                          value={product.reservedQty}
                          onChange={(event) =>
                            updateReservedQty(product.id, Number(event.target.value))
                          }
                        />
                        <Input
                          type="number"
                          min={0}
                          value={product.sellPrice}
                          onChange={(event) =>
                            updateReservedPrice(
                              product.id,
                              Number(event.target.value),
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeSelectedProduct(product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full"
                  disabled={createReservationMutation.isPending}
                  loading={createReservationMutation.isPending}
                  onClick={handleCreateReservation}
                >
                  إنشاء الحجز
                </Button>
              </div>
            </PopupForm>
          }
          renderRowActions={(row) => {
            const reservation = row.originalReservation as MaterialReservation;
            const isOpenReservation = reservation.status === "reserved";

            return (
              <div className="flex items-center justify-center gap-2">
                <Badge variant={statusVariant(reservation.status) as any}>
                  {statusLabel(reservation.status)}
                </Badge>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!isOpenReservation}
                  onClick={() => openCloseReservation(reservation)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  إغلاق
                </Button>

                <ConfirmForm
                  title="إلغاء الحجز"
                  description="سيتم تحرير كل الكمية المحجوزة بدون إنشاء فاتورة."
                  confirmText="إلغاء الحجز"
                  loading={cancelReservationMutation.isPending}
                  disabled={!isOpenReservation}
                  onConfirm={() =>
                    cancelReservationMutation.mutate(reservation.id)
                  }
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={!isOpenReservation}
                    >
                      <Ban className="h-4 w-4" />
                      إلغاء
                    </Button>
                  }
                />
              </div>
            );
          }}
        />

        <PopupForm
          title="إغلاق حجز التركيب"
          isOpen={isCloseOpen}
          setIsOpen={(value) => {
            setIsCloseOpen(value);
            if (!value) resetCloseForm();
          }}
          trigger={<span className="hidden" />}
        >
          {selectedReservation && (
            <div className="space-y-4" dir="rtl">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5" />
                    الكمية المستخدمة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedReservation.items.map((item) => (
                    <div
                      key={itemKey(item.productId, item.warehouse)}
                      className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_120px_120px]"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          المحجوز: {formatNumber(item.reservedQty)}{" "}
                          {item.unit || ""} | السعر: {formatNumber(item.sellPrice)}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={item.reservedQty}
                        placeholder="المستخدم"
                        value={
                          usedQuantities[itemKey(item.productId, item.warehouse)] ??
                          ""
                        }
                        onChange={(event) =>
                          setUsedQuantities((current) => ({
                            ...current,
                            [itemKey(item.productId, item.warehouse)]:
                              event.target.value,
                          }))
                        }
                      />
                      <div className="rounded-md bg-muted px-3 py-2 text-sm">
                        المرتجع:{" "}
                        {formatNumber(
                          item.reservedQty -
                            toNumber(
                              usedQuantities[
                                itemKey(item.productId, item.warehouse)
                              ],
                            ),
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="grid gap-3 md:grid-cols-3">
                <FormInput
                  label="حسم نسبة %"
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                />
                <FormInput
                  label="حسم مبلغ"
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                />
                <FormInput
                  label="الإجمالي النهائي"
                  value={closeFinalTotal}
                  disabled
                  onChange={() => {}}
                />
              </div>

              {closeTotalBeforeDiscount > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {(["cash", "part", "debt"] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={paymentStatus === status ? "default" : "outline"}
                        onClick={() => setPaymentStatus(status)}
                      >
                        {status === "cash"
                          ? "نقدا"
                          : status === "part"
                          ? "جزئي"
                          : "دين"}
                      </Button>
                    ))}
                  </div>

                  <>
                    <div className="grid gap-3 md:grid-cols-2">
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
                          setExchangeRate(Number(event.target.value))
                        }
                      />
                    </div>
                  </>

                  {paymentStatus === "part" && (
                    <FormInput
                      label="قيمة الدفعة"
                      type="number"
                      min={0}
                      value={partValue}
                      onChange={(event) => setPartValue(event.target.value)}
                    />
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
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={closeReservationMutation.isPending}
                loading={closeReservationMutation.isPending}
                onClick={handleCloseReservation}
              >
                إغلاق الحجز وإنشاء الفاتورة
              </Button>
            </div>
          )}
        </PopupForm>
      </div>
    </DashboardLayout>
  );
}
