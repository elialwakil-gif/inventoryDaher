import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AccountSelect from "@/components/Accounts/AccountSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  goodsBalanceLabel,
  goodsSettlementPreview,
} from "@/lib/goodsSettlements";
import { formatMoney, toMoneyNumber } from "@/lib/money";
import {
  createGoodsSettlement,
  newSettlementRequestId,
  type GoodsSettlementInput,
} from "@/services/goodsSettlements";
import getAllProducts from "@/services/products";
import type { Product } from "@/services/transaction";
import { getAllWarehouses } from "@/services/warehouse";

interface SettlementParty {
  id?: string;
  name?: string;
  balance?: number;
  balanceUSD?: number;
  balanceSYP?: number;
  defaultReceivableAccountId?: string;
  defaultPayableAccountId?: string;
  defaultInventoryAccountId?: string;
}

interface Props {
  partyType: "customer" | "supplier";
  party: SettlementParty;
  invoice?: {
    id: string;
    remainingUSD?: number;
    remainingDebt?: number;
    exchangeRate?: number;
    paymentCurrency?: string;
    currency?: string;
  };
}

interface DraftItem {
  productId: string;
  quantity: number;
  settlementPrice: number;
}

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");

export const refreshGoodsSettlementQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  [
    "customer-details",
    "supplier-details",
    "customers-table",
    "suppliers-table",
    "products-table",
    "products",
    "goods-settlement-products",
    "payments-table",
    "financial-operations",
    "sells-table",
    "purchases-table",
    "accounts-table",
    "journal-entries",
    "vehicles",
    "vehicle-summary",
    "driver-statement",
  ].forEach((key) => {
    void queryClient.invalidateQueries({ queryKey: [key] });
  });
};

export default function GoodsSettlementForm({
  partyType,
  party,
  invoice,
}: Props) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"receive" | "deliver">(
    partyType === "customer" ? "receive" : "deliver",
  );
  const [warehouse, setWarehouse] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<"USD" | "SYP">("USD");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [partyAccountId, setPartyAccountId] = useState("");
  const [inventoryAccountId, setInventoryAccountId] = useState("");
  const [differenceAccountId, setDifferenceAccountId] = useState("");
  const [note, setNote] = useState("");
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const submission = useRef<{
    fingerprint: string;
    payload: GoodsSettlementInput;
  }>();
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

  const productsQuery = useQuery<Product[]>({
    queryKey: ["goods-settlement-products"],
    queryFn: getAllProducts,
    enabled: open,
    staleTime: 0,
  });
  const warehousesQuery = useQuery({
    queryKey: ["goods-settlement-warehouses"],
    queryFn: getAllWarehouses,
    enabled: open,
    staleTime: 0,
  });
  const warehouses = (warehousesQuery.data || []).filter(
    (item) => item.isActive !== false,
  );
  const selectedWarehouse = warehouses.find((item) => item.name === warehouse);
  const products = productsQuery.data || [];
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const previewItems = items.map((item) => ({
    ...item,
    payPrice: toMoneyNumber(productMap.get(item.productId)?.payPrice),
  }));
  const invoiceRate = invoice
    ? (invoice.paymentCurrency || invoice.currency) === "SYP"
      ? toMoneyNumber(invoice.exchangeRate)
      : 0
    : undefined;
  const preview = goodsSettlementPreview({
    items: previewItems,
    direction,
    currency,
    exchangeRate,
    balanceUSD: toMoneyNumber(party.balanceUSD ?? party.balance),
    balanceSYP: toMoneyNumber(party.balanceSYP),
    balanceRateSYP: invoiceRate,
  });
  const needsDifferenceAccount =
    direction === "deliver" && Math.abs(preview.differenceUSD) >= 0.0005;
  const matches = products.filter((product) => {
    if (
      !selectedWarehouse ||
      ![selectedWarehouse.id, selectedWarehouse.name].some(
        (value) => normalizeText(value) === normalizeText(product.warehouse),
      )
    )
      return false;
    const words = normalizeText(search).split(" ").filter(Boolean);
    const text = normalizeText(`${product.name} ${product.code}`);
    return words.every((word) => text.includes(word));
  });
  const selectedIds = new Set(items.map((item) => item.productId));
  const availableProducts = matches.filter(
    (product) => !selectedIds.has(product.id),
  );

  const save = useMutation({
    mutationFn: createGoodsSettlement,
    onSuccess: () => {
      toast.success("تم تسجيل التسوية بالبضاعة وتحديث المخزون والحساب");
      setSubmissionUncertain(false);
      setOpen(false);
      refreshGoodsSettlementQueries(queryClient);
    },
    onError: (error) => {
      if (!(error as Error & { outcomeUncertain?: boolean }).outcomeUncertain)
        setSubmissionUncertain(false);
      toast.error(error.message);
    },
  });

  const setDialogOpen = (value: boolean) => {
    if (save.isPending) return;
    if (value && !open) {
      setItems([]);
      setWarehouse("");
      setSearch("");
      setCurrency("USD");
      setExchangeRate(1);
      setDirection(partyType === "customer" ? "receive" : "deliver");
      setPartyAccountId(
        (partyType === "customer"
          ? party.defaultReceivableAccountId
          : party.defaultPayableAccountId) || "",
      );
      setInventoryAccountId(party.defaultInventoryAccountId || "");
      setDifferenceAccountId("");
      setNote(invoice ? `تسوية بالبضاعة للفاتورة ${invoice.id}` : "");
      submission.current = undefined;
      setSubmissionUncertain(false);
    }
    setOpen(value);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submissionUncertain && submission.current) {
      save.mutate(submission.current.payload);
      return;
    }
    if (!party.id || !warehouse || !selectedWarehouse)
      return toast.error("اختر الطرف والمستودع");
    if (!preview.validRate)
      return toast.error("أدخل سعر صرف صحيحًا أكبر من صفر");
    if (
      !items.length ||
      items.some(
        (item) =>
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.settlementPrice) ||
          item.settlementPrice <= 0,
      )
    )
      return toast.error("أضف الأصناف بكميات وأسعار متفق عليها أكبر من صفر");
    if (
      !partyAccountId ||
      !inventoryAccountId ||
      (needsDifferenceAccount && !differenceAccountId)
    )
      return toast.error(
        "اختر حساب الطرف والمخزون وحساب فرق التسوية عند وجود فرق",
      );
    const accountIds = [
      partyAccountId,
      inventoryAccountId,
      ...(needsDifferenceAccount ? [differenceAccountId] : []),
    ];
    if (new Set(accountIds).size !== accountIds.length)
      return toast.error(
        "حساب الطرف والمخزون والفرق يجب أن تكون حسابات مختلفة",
      );
    if (items.some((item) => !productMap.has(item.productId)))
      return toast.error("أحد الأصناف لم يعد متاحًا. حدّث قائمة الأصناف.");
    if (
      direction === "deliver" &&
      items.some(
        (item) =>
          item.quantity >
          Math.max(
            0,
            toMoneyNumber(productMap.get(item.productId)?.quantity) -
              toMoneyNumber(productMap.get(item.productId)?.reservedQuantity),
          ),
      )
    )
      return toast.error("كمية التسليم تتجاوز المخزون المتاح بعد الحجز");
    if (
      invoice &&
      preview.totalUSD >
        toMoneyNumber(invoice.remainingUSD ?? invoice.remainingDebt) + 0.0001
    )
      return toast.error("قيمة التسوية تتجاوز المتبقي على الفاتورة");
    const payload: Omit<GoodsSettlementInput, "requestId"> = {
      partyType,
      ...(partyType === "customer"
        ? { customerId: party.id }
        : { supplierId: party.id }),
      goodsDirection: direction,
      warehouse,
      items,
      currency,
      exchangeRate: currency === "USD" ? 1 : exchangeRate,
      note,
      partyAccountId,
      inventoryAccountId,
      ...(needsDifferenceAccount ? { differenceAccountId } : {}),
      ...(invoice
        ? partyType === "customer"
          ? { sellId: invoice.id }
          : { purchaseId: invoice.id }
        : {}),
    };
    const fingerprint = JSON.stringify(payload);
    if (submission.current?.fingerprint !== fingerprint)
      submission.current = {
        fingerprint,
        payload: { ...payload, requestId: newSettlementRequestId() },
      };
    setSubmissionUncertain(true);
    save.mutate(submission.current.payload);
  };

  const addProduct = (product: Product) => {
    setItems((current) => [
      ...current,
      { productId: product.id, quantity: 1, settlementPrice: 0 },
    ]);
    setSearch("");
  };
  const updateItem = (
    id: string,
    key: "quantity" | "settlementPrice",
    value: number,
  ) =>
    setItems((current) =>
      current.map((item) =>
        item.productId === id ? { ...item, [key]: value } : item,
      ),
    );

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={
            !party.id ||
            (invoice &&
              toMoneyNumber(invoice.remainingUSD ?? invoice.remainingDebt) <= 0)
          }
          onClick={(event) => event.stopPropagation()}
        >
          <Package className="ml-2 h-4 w-4" />
          {invoice ? "تسديد بالبضاعة" : "دفعة بالبضاعة"}
        </Button>
      </DialogTrigger>
      <DialogContent
        dir="rtl"
        className="max-w-4xl"
        onInteractOutside={(event) => {
          if (save.isPending) event.preventDefault();
        }}
      >
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>تسوية بالبضاعة · {party.name}</DialogTitle>
          <DialogDescription>
            تُحتسب القيمة بالسعر المتفق عليه وتُحدّث كمية المخزون ورصيد الحساب
            عند التسجيل.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset
            disabled={save.isPending || submissionUncertain}
            className="space-y-5 disabled:opacity-75"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>اتجاه حركة البضاعة</Label>
                <Select
                  value={direction}
                  disabled={Boolean(invoice)}
                  onValueChange={(value: "receive" | "deliver") =>
                    setDirection(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receive">
                      استلام من {partyType === "customer" ? "الزبون" : "المورد"}
                    </SelectItem>
                    <SelectItem value="deliver">
                      تسليم إلى {partyType === "customer" ? "الزبون" : "المورد"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>المستودع</Label>
                <Select
                  value={warehouse}
                  onValueChange={(value) => {
                    setWarehouse(value);
                    setItems([]);
                    setSearch("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستودع" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>عملة السعر المتفق عليه</Label>
                <Select
                  value={currency}
                  onValueChange={(value: "USD" | "SYP") => {
                    setCurrency(value);
                    setItems((current) =>
                      current.map((item) => ({ ...item, settlementPrice: 0 })),
                    );
                  }}
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
              <div>
                <Label htmlFor={`goods-rate-${party.id}`}>
                  سعر الصرف · SYP لكل USD
                </Label>
                <Input
                  id={`goods-rate-${party.id}`}
                  type="number"
                  min="0.001"
                  step="any"
                  value={currency === "USD" ? 1 : exchangeRate}
                  disabled={currency === "USD"}
                  onChange={(event) =>
                    setExchangeRate(Number(event.target.value))
                  }
                />
              </div>
            </div>
            {invoice && (
              <p className="rounded-md border bg-muted p-3 text-sm">
                المتبقي على الفاتورة:{" "}
                {formatMoney(
                  toMoneyNumber(invoice.remainingUSD ?? invoice.remainingDebt),
                  "USD",
                )}
                . تسديد{" "}
                {partyType === "customer"
                  ? "فاتورة البيع يكون باستلام بضاعة من الزبون"
                  : "فاتورة الشراء يكون بتسليم بضاعة إلى المورد"}
                . لتسجيل الاتجاه الآخر استخدم دفعة على الحساب العام.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor={`goods-search-${party.id}`}>
                البحث عن الصنف بالاسم أو الكود
              </Label>
              <Input
                id={`goods-search-${party.id}`}
                value={search}
                disabled={!warehouse}
                placeholder={
                  warehouse ? "ابحث عن الصنف" : "اختر المستودع أولًا"
                }
                onChange={(event) => setSearch(event.target.value)}
              />
              {(productsQuery.isLoading || warehousesQuery.isLoading) && (
                <p role="status">جاري تحميل الأصناف والمستودعات…</p>
              )}
              {(productsQuery.isError || warehousesQuery.isError) && (
                <div className="text-destructive">
                  تعذر تحميل البيانات.{" "}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      void productsQuery.refetch();
                      void warehousesQuery.refetch();
                    }}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              )}
              {warehouse && !productsQuery.isLoading && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {!availableProducts.length && (
                    <p className="p-2 text-sm text-muted-foreground">
                      لا توجد أصناف مطابقة غير مضافة.
                    </p>
                  )}
                  {availableProducts.map((product) => {
                    const available = Math.max(
                      0,
                      toMoneyNumber(product.quantity) -
                        toMoneyNumber(product.reservedQuantity),
                    );
                    return (
                      <Button
                        key={product.id}
                        type="button"
                        variant="ghost"
                        className="flex h-auto w-full justify-between gap-2 whitespace-normal text-right"
                        disabled={direction === "deliver" && available <= 0}
                        onClick={() => addProduct(product)}
                      >
                        <span>
                          {product.name} · {product.code}
                          <small className="block text-muted-foreground">
                            المتاح: {available} {product.unit}
                            {direction === "deliver" && available <= 0
                              ? " · غير متاح للتسليم"
                              : ""}
                          </small>
                        </span>
                        <Plus className="h-4 w-4 shrink-0" />
                      </Button>
                    );
                  })}
                </div>
              )}
              {direction === "receive" && (
                <p className="text-sm text-muted-foreground">
                  لصنف جديد،{" "}
                  <Link
                    to="/products"
                    target="_blank"
                    className="text-primary underline"
                  >
                    أضفه من صفحة المنتجات بكمية صفر
                  </Link>{" "}
                  ثم{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => void productsQuery.refetch()}
                  >
                    حدّث الأصناف
                  </Button>{" "}
                  لتسجيل الاستلام.
                </p>
              )}
            </div>
            {items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-right">الصنف</th>
                      <th className="p-2">الكمية</th>
                      <th className="p-2">السعر المتفق عليه · {currency}</th>
                      <th className="p-2">الإجمالي</th>
                      <th className="p-2">المخزون قبل ← بعد</th>
                      <th className="p-2">
                        <span className="sr-only">حذف</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const product = productMap.get(item.productId);
                      const quantityBefore = toMoneyNumber(product?.quantity);
                      const quantityAfter =
                        quantityBefore +
                        (direction === "receive" ? 1 : -1) * item.quantity;
                      const available =
                        quantityBefore -
                        toMoneyNumber(product?.reservedQuantity);
                      return (
                        <tr key={item.productId} className="border-b">
                          <td className="p-2">
                            {product?.name || item.productId}
                            <small className="block text-muted-foreground">
                              {product?.code} · المتاح {Math.max(0, available)}
                            </small>
                          </td>
                          <td className="min-w-24 p-2">
                            <Input
                              aria-label={`كمية ${product?.name}`}
                              type="number"
                              min="0.001"
                              step="any"
                              max={
                                direction === "deliver"
                                  ? Math.max(0, available)
                                  : undefined
                              }
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  item.productId,
                                  "quantity",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="min-w-32 p-2">
                            <Input
                              aria-label={`سعر ${product?.name}`}
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.settlementPrice}
                              onChange={(event) =>
                                updateItem(
                                  item.productId,
                                  "settlementPrice",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap p-2">
                            {formatMoney(
                              item.quantity * item.settlementPrice,
                              currency,
                            )}
                          </td>
                          <td
                            className={`whitespace-nowrap p-2 ${direction === "deliver" && item.quantity > available ? "text-destructive" : ""}`}
                          >
                            {quantityBefore} ← {quantityAfter}
                          </td>
                          <td>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`حذف ${product?.name}`}
                              onClick={() =>
                                setItems((current) =>
                                  current.filter(
                                    (entry) =>
                                      entry.productId !== item.productId,
                                  ),
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <AccountSelect
                label={
                  partyType === "customer" ? "حساب العملاء" : "حساب الموردين"
                }
                value={partyAccountId}
                onChange={setPartyAccountId}
                filterType={partyType === "customer" ? "receivable" : "payable"}
              />
              <AccountSelect
                label="حساب المخزون"
                value={inventoryAccountId}
                onChange={setInventoryAccountId}
                filterType="inventory"
              />
              {needsDifferenceAccount && (
                <AccountSelect
                  label="حساب فرق التسوية"
                  value={differenceAccountId}
                  onChange={setDifferenceAccountId}
                  filterType="all"
                />
              )}
            </div>
            <div>
              <Label htmlFor={`goods-note-${party.id}`}>ملاحظات</Label>
              <Textarea
                id={`goods-note-${party.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </fieldset>
          <div className="grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
            <div>
              <span className="text-sm text-muted-foreground">
                قيمة التسوية
              </span>
              <p className="font-bold">
                {formatMoney(preview.totalOriginal, currency)}
                {currency === "SYP" &&
                  ` / ${formatMoney(preview.totalUSD, "USD")}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                تكلفة المخزون / فرق التسوية
              </span>
              <p>
                {formatMoney(preview.costUSD, "USD")} /{" "}
                {formatMoney(preview.differenceUSD, "USD")}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                رصيد الحساب قبل التسوية
              </span>
              <p>
                {formatMoney(
                  Math.abs(toMoneyNumber(party.balanceUSD ?? party.balance)),
                  "USD",
                )}{" "}
                ·{" "}
                {goodsBalanceLabel(
                  toMoneyNumber(party.balanceUSD ?? party.balance),
                  partyType,
                )}
              </p>
              {toMoneyNumber(party.balanceSYP) !== 0 && (
                <p>
                  {formatMoney(
                    Math.abs(toMoneyNumber(party.balanceSYP)),
                    "SYP",
                  )}{" "}
                  ·{" "}
                  {goodsBalanceLabel(
                    toMoneyNumber(party.balanceSYP),
                    partyType,
                  )}
                </p>
              )}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                رصيد الحساب بعد التسوية
              </span>
              <p className="font-semibold">
                {formatMoney(Math.abs(preview.nextUSD), "USD")} ·{" "}
                {goodsBalanceLabel(preview.nextUSD, partyType)}
              </p>
              {preview.nextSYP !== 0 && (
                <p>
                  {formatMoney(Math.abs(preview.nextSYP), "SYP")} ·{" "}
                  {goodsBalanceLabel(preview.nextSYP, partyType)}
                </p>
              )}
            </div>
          </div>
          {submissionUncertain && !save.isPending && (
            <p className="text-sm">
              يمكن إعادة إرسال العملية نفسها بأمان للتحقق من تسجيلها. لإدخال
              عملية أخرى أغلق النموذج وافتحه بعد تحديث كشف الحساب.
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={
              save.isPending ||
              productsQuery.isLoading ||
              productsQuery.isError ||
              warehousesQuery.isError ||
              !items.length
            }
            loading={save.isPending}
          >
            {submissionUncertain && !save.isPending
              ? "إعادة إرسال التسوية نفسها"
              : "تسجيل التسوية بالبضاعة"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
