import AccountSelect from "@/components/Accounts/AccountSelect";
import { DataTable } from "@/components/dashboard/DataTable";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PopupForm from "@/components/ui/custom/PopupForm";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import getAllProducts from "@/services/products";
import type { Product } from "@/services/transaction";
import { getAllUsers } from "@/services/users";
import {
  createVehicle,
  getAllVehicles,
  loadVehicle,
  VehicleSummary,
} from "@/services/vehicles";
import { getAllWarehouses } from "@/services/warehouse";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Plus, Truck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type LoadProduct = Product & { loadQty: number; loadSellPrice: number };

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

const getAvailableQuantity = (product: Product) =>
  Math.max(toNumber(product.quantity) - toNumber(product.reservedQuantity), 0);

export default function Vehicles() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoadOpen, setIsLoadOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [location, setLocation] = useState("");
  const [defaultSalesAccountId, setDefaultSalesAccountId] = useState("");
  const [defaultPaymentAccountId, setDefaultPaymentAccountId] = useState("");
  const [defaultReceivableAccountId, setDefaultReceivableAccountId] = useState("");
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [loadSearch, setLoadSearch] = useState("");
  const [loadNote, setLoadNote] = useState("");
  const [loadProducts, setLoadProducts] = useState<LoadProduct[]>([]);

  const { data: vehicleSummaries = [], isLoading } = useQuery({
    queryKey: ["vehicles-table"],
    queryFn: () => getAllVehicles(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-table"],
    queryFn: getAllUsers,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses-table"],
    queryFn: getAllWarehouses,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-table"],
    queryFn: getAllProducts,
  });

  const selectedVehicle =
    vehicleSummaries.find(
      (summary) => summary.vehicle.id === selectedVehicleId,
    ) || vehicleSummaries[0];

  const standardWarehouses = useMemo(
    () =>
      warehouses.filter(
        (warehouse) =>
          warehouse.type !== "vehicle" &&
          warehouse.name !== selectedVehicle?.vehicle.name,
      ),
    [selectedVehicle?.vehicle.name, warehouses],
  );

  const filteredLoadProducts = useMemo(() => {
    const search = loadSearch.trim().toLowerCase();
    if (!sourceWarehouse || !search) return [];

    return products
      .filter((product) => product.warehouse === sourceWarehouse)
      .filter((product) => getAvailableQuantity(product) > 0)
      .filter(
        (product) =>
          product.name?.toLowerCase().includes(search) ||
          product.code?.toLowerCase().includes(search),
      )
      .slice(0, 12);
  }, [loadSearch, products, sourceWarehouse]);

  const resetCreateForm = () => {
    setVehicleName("");
    setPlateNumber("");
    setDriverId("");
    setLocation("");
    setDefaultSalesAccountId("");
    setDefaultPaymentAccountId("");
    setDefaultReceivableAccountId("");
  };

  const resetLoadForm = () => {
    setSourceWarehouse("");
    setLoadSearch("");
    setLoadNote("");
    setLoadProducts([]);
  };

  const invalidateVehicleData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["vehicles-table"] }),
      queryClient.invalidateQueries({ queryKey: ["products-table"] }),
      queryClient.invalidateQueries({ queryKey: ["warehouses-table"] }),
    ]);
  };

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      toast.success("تم إنشاء السيارة بنجاح");
      resetCreateForm();
      setIsCreateOpen(false);
      await invalidateVehicleData();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const loadVehicleMutation = useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: string;
      payload: Parameters<typeof loadVehicle>[1];
    }) => loadVehicle(vehicleId, payload),
    onSuccess: async () => {
      toast.success("تم تحميل السيارة بنجاح");
      resetLoadForm();
      setIsLoadOpen(false);
      await invalidateVehicleData();
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const submitCreateVehicle = () => {
    if (!vehicleName.trim()) {
      toast.error("أدخل اسم السيارة أو مستودعها");
      return;
    }

    const selectedDriver = users.find(
      (user) => String(user.id || user.username) === driverId,
    );

    createVehicleMutation.mutate({
      name: vehicleName.trim(),
      plateNumber: plateNumber.trim() || undefined,
      driverId: driverId || undefined,
      driverName: selectedDriver?.username || undefined,
      location: location.trim() || undefined,
      defaultSalesAccountId: defaultSalesAccountId || undefined,
      defaultPaymentAccountId: defaultPaymentAccountId || undefined,
      defaultReceivableAccountId: defaultReceivableAccountId || undefined,
    });
  };

  const addLoadProduct = (product: Product) => {
    setLoadProducts((current) => {
      if (current.some((item) => item.id === product.id)) return current;

      return [
        ...current,
        {
          ...product,
          loadQty: 1,
          loadSellPrice: toNumber(product.sellPrice),
        },
      ];
    });
    setLoadSearch("");
  };

  const updateLoadProduct = (
    id: string,
    patch: Partial<Pick<LoadProduct, "loadQty" | "loadSellPrice">>,
  ) => {
    setLoadProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, ...patch } : product,
      ),
    );
  };

  const submitLoadVehicle = () => {
    const vehicle = selectedVehicle?.vehicle;

    if (!vehicle) {
      toast.error("اختر سيارة");
      return;
    }

    if (!sourceWarehouse) {
      toast.error("اختر المستودع المصدر");
      return;
    }

    if (!loadProducts.length) {
      toast.error("أضف منتجاً واحداً على الأقل");
      return;
    }

    if (
      loadProducts.some(
        (product) =>
          toNumber(product.loadQty) <= 0 ||
          toNumber(product.loadQty) > getAvailableQuantity(product),
      )
    ) {
      toast.error("تأكد من كميات التحميل");
      return;
    }

    loadVehicleMutation.mutate({
      vehicleId: vehicle.id,
      payload: {
        sourceWarehouse,
        note: loadNote.trim() || undefined,
        items: loadProducts.map((product) => ({
          productId: product.id,
          quantity: toNumber(product.loadQty),
          sellPrice: toNumber(product.loadSellPrice),
        })),
      },
    });
  };

  const vehicleRows = vehicleSummaries.map((summary) => ({
    id: summary.vehicle.id,
    name: summary.vehicle.name,
    plateNumber: summary.vehicle.plateNumber || "",
    driverName: summary.vehicle.driverName || summary.vehicle.driverId || "",
    productsCount: summary.totals.productsCount,
    totalQuantity: formatNumber(summary.totals.totalQuantity),
    stockSellValue: formatMoney(summary.totals.stockSellValue),
    salesTotal: formatMoney(summary.totals.salesTotal),
    originalSummary: summary,
  }));

  const selectedInventoryRows = (selectedVehicle?.products || []).map(
    (product) => ({
      id: product.id,
      name: product.name,
      code: product.code,
      quantity: formatNumber(product.quantity),
      reservedQuantity: formatNumber(product.reservedQuantity),
      sellPrice: formatMoney(product.sellPrice),
      value: formatMoney(toNumber(product.quantity) * toNumber(product.sellPrice)),
    }),
  );

  const selectedSalesRows = (selectedVehicle?.sales || []).map((sale) => ({
    id: sale.id,
    customerId: sale.customerId,
    totalPrice: formatMoney(sale.totalPrice),
    paymentStatus: sale.paymentStatus,
    date: sale.date || "",
  }));

  return (
    <DashboardLayout>
      <div className="space-y-4" dir="rtl">
        <DataTable
          title="السيارات / المستودعات المتنقلة"
          description="راقب مخزون كل سيارة، حمّل بضاعة للسائق، وشاهد مبيعات اليوم."
          columns={[
            { key: "name", label: "السيارة", sortable: true },
            { key: "plateNumber", label: "اللوحة", sortable: true },
            { key: "driverName", label: "السائق", sortable: true },
            { key: "productsCount", label: "عدد المواد", sortable: true },
            { key: "totalQuantity", label: "الكمية", sortable: true },
            { key: "stockSellValue", label: "قيمة المخزون", sortable: true },
            { key: "salesTotal", label: "مبيعات اليوم", sortable: true },
          ]}
          data={vehicleRows}
          isLoading={isLoading}
          onRowClick={(row) => setSelectedVehicleId(row.id)}
          getRowClassName={(row) =>
            row.id === selectedVehicle?.vehicle.id
              ? "bg-green-50 hover:bg-green-100"
              : ""
          }
          titleButton={
            <div className="flex flex-col gap-2 sm:flex-row">
              <PopupForm
                title="إضافة سيارة"
                isOpen={isCreateOpen}
                setIsOpen={setIsCreateOpen}
                trigger={
                  <Button type="button" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    سيارة جديدة
                  </Button>
                }
              >
                <div className="space-y-3" dir="rtl">
                  <Input
                    value={vehicleName}
                    onChange={(event) => setVehicleName(event.target.value)}
                    placeholder="اسم السيارة / اسم المستودع"
                  />
                  <Input
                    value={plateNumber}
                    onChange={(event) => setPlateNumber(event.target.value)}
                    placeholder="رقم اللوحة"
                  />
                  <Input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="ملاحظة أو خط سير"
                  />
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر السائق" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((user) => user.role !== "admin")
                        .map((user) => (
                          <SelectItem
                            key={String(user.id || user.username)}
                            value={String(user.id || user.username)}
                          >
                            {user.username}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <AccountSelect
                    label="حساب المبيعات الافتراضي"
                    value={defaultSalesAccountId}
                    onChange={setDefaultSalesAccountId}
                    filterType="sales"
                  />
                  <AccountSelect
                    label="حساب القبض الافتراضي"
                    value={defaultPaymentAccountId}
                    onChange={setDefaultPaymentAccountId}
                    filterType="payment"
                  />
                  <AccountSelect
                    label="حساب العملاء الافتراضي"
                    value={defaultReceivableAccountId}
                    onChange={setDefaultReceivableAccountId}
                    filterType="receivable"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    loading={createVehicleMutation.isPending}
                    disabled={createVehicleMutation.isPending}
                    onClick={submitCreateVehicle}
                  >
                    حفظ السيارة
                  </Button>
                </div>
              </PopupForm>

              <PopupForm
                title="تحميل سيارة"
                isOpen={isLoadOpen}
                setIsOpen={(value) => {
                  setIsLoadOpen(value);
                  if (!value) resetLoadForm();
                }}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={!selectedVehicle}
                  >
                    <PackagePlus className="h-4 w-4" />
                    تحميل
                  </Button>
                }
              >
                <div className="space-y-4" dir="rtl">
                  <div className="rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2 font-semibold">
                      <Truck className="h-4 w-4" />
                      {selectedVehicle?.vehicle.name || "اختر سيارة"}
                    </div>
                  </div>
                  <Select value={sourceWarehouse} onValueChange={setSourceWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="المستودع المصدر" />
                    </SelectTrigger>
                    <SelectContent>
                      {standardWarehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.name}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={loadSearch}
                    onChange={(event) => setLoadSearch(event.target.value)}
                    placeholder="ابحث عن منتج للتحميل"
                  />
                  {filteredLoadProducts.length > 0 && (
                    <div className="max-h-52 overflow-y-auto rounded-md border">
                      {filteredLoadProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border-b p-3 text-right text-sm last:border-b-0 hover:bg-muted"
                          onClick={() => addLoadProduct(product)}
                        >
                          <span>
                            {product.name} ({product.code})
                          </span>
                          <span className="text-muted-foreground">
                            المتاح: {formatNumber(getAvailableQuantity(product))}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {loadProducts.map((product) => (
                    <div
                      key={product.id}
                      className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_110px_110px_40px]"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.code} | المتاح:{" "}
                          {formatNumber(getAvailableQuantity(product))}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={getAvailableQuantity(product)}
                        value={product.loadQty}
                        onChange={(event) =>
                          updateLoadProduct(product.id, {
                            loadQty: toNumber(event.target.value),
                          })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        value={product.loadSellPrice}
                        onChange={(event) =>
                          updateLoadProduct(product.id, {
                            loadSellPrice: toNumber(event.target.value),
                          })
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() =>
                          setLoadProducts((current) =>
                            current.filter((item) => item.id !== product.id),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Input
                    value={loadNote}
                    onChange={(event) => setLoadNote(event.target.value)}
                    placeholder="ملاحظة التحميل"
                  />
                  <Button
                    type="button"
                    className="w-full"
                    loading={loadVehicleMutation.isPending}
                    disabled={loadVehicleMutation.isPending}
                    onClick={submitLoadVehicle}
                  >
                    تأكيد التحميل
                  </Button>
                </div>
              </PopupForm>
            </div>
          }
        />

        {selectedVehicle && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص {selectedVehicle.vehicle.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span>السائق</span>
                  <strong>
                    {selectedVehicle.vehicle.driverName ||
                      selectedVehicle.vehicle.driverId ||
                      "غير محدد"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>الكمية الموجودة</span>
                  <strong>{formatNumber(selectedVehicle.totals.totalQuantity)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>قيمة المخزون بيعاً</span>
                  <strong>{formatMoney(selectedVehicle.totals.stockSellValue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>مبيعات اليوم</span>
                  <strong>{formatMoney(selectedVehicle.totals.salesTotal)}</strong>
                </div>
              </CardContent>
            </Card>

            <div className="xl:col-span-2">
              <DataTable
                title="مخزون السيارة"
                columns={[
                  { key: "name", label: "المادة", sortable: true },
                  { key: "code", label: "الكود", sortable: true },
                  { key: "quantity", label: "الكمية", sortable: true },
                  { key: "reservedQuantity", label: "محجوز", sortable: true },
                  { key: "sellPrice", label: "سعر البيع", sortable: true },
                  { key: "value", label: "القيمة", sortable: true },
                ]}
                data={selectedInventoryRows}
                defaultPageSize={5}
              />
            </div>

            <div className="xl:col-span-3">
              <DataTable
                title="مبيعات السيارة اليوم"
                columns={[
                  { key: "id", label: "المعرف", hidden: true },
                  { key: "customerId", label: "الزبون", sortable: true },
                  { key: "paymentStatus", label: "الدفع", sortable: true },
                  { key: "totalPrice", label: "الإجمالي", sortable: true },
                  { key: "date", label: "التاريخ", sortable: true },
                ]}
                data={selectedSalesRows}
                defaultPageSize={5}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
