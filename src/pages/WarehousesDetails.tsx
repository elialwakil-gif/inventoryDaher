import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Warehouse } from "lucide-react";
import { useWarehouseContext } from "@/contexts/WarehouseContexts";
import { useQuery } from "@tanstack/react-query";
import {
  getByWarehouse,
  getSalesByWarehouseAndDate,
} from "@/services/warehouse";
import Loading from "@/components/ui/custom/Loading";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useMemo, useState } from "react";
import AddProductForm from "@/components/Products/AddProductForm";
import TransfareForm from "@/components/Products/TransfareForm";
import { ProductTableRow } from "./Products";
import ProductsDataTable from "@/components/Products/ProductsDataTable";


export default function WarehousesDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouseContext();
  
  const [openTransfare, setOpenTransfare] = useState(false);
  const [productRow, setProductRow] = useState({});

  const [openForm, setOpenForm] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const routeWarehouse = decodeURIComponent(id || "");
  const warehouse = warehouses.find(
    (w) => String(w.id) === routeWarehouse || String(w.name) === routeWarehouse,
  );
  const warehouseName = warehouse?.name || routeWarehouse;

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", warehouseName],
    queryFn: () => getSalesByWarehouseAndDate(warehouseName),
    enabled: !!warehouseName && !!warehouse,
  });

  const totalTodaySales = useMemo(() => {
    return (
      sales?.reduce(
        (sum, c) => sum + Number(c.totalPrice) - Number(c.remainingDebt),
        0,
      ) || 0
    );
  }, [sales]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products-table", warehouseName],
    queryFn: () => getByWarehouse(warehouseName),
    enabled: !!warehouseName && !!warehouse,
  });

  if (warehousesLoading) {
    return (
      <DashboardLayout>
        <Loading />
      </DashboardLayout>
    );
  }

  if (!warehouse) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[300px] gap-3">
          <p className="text-lg font-medium">المستودع غير موجود</p>
          <Button onClick={() => navigate("/warehouses")}>الرجوع</Button>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      {/* Forms */}
      <AddProductForm
        isOpen={openForm}
        setIsOpen={setOpenForm}
        row={editRow}
      />
      <TransfareForm
        isOpen={openTransfare}
        setIsOpen={setOpenTransfare}
        row={productRow as ProductTableRow}
      />
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 break-words text-2xl font-bold">
            <Warehouse size={22} />
            {warehouse.name}
          </h1>
          <p className="text-sm text-muted-foreground">تفاصيل المستودع</p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/warehouses")}
          className="w-full gap-2 sm:w-auto"
        >
          <ArrowLeft size={16} />
          رجوع
        </Button>
      </div>

      {/* Info */}
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>الموقع:</strong> {warehouse?.location || "غير محدد"}
            </p>
            <p>
              <strong>الحالة:</strong> {warehouse?.isActive ? "نشط" : "غير نشط"}
            </p>
            <p>
              <strong>تاريخ الإنشاء:</strong>{" "}
              {new Date(warehouse?.createdDate).toLocaleDateString()}
            </p>
            <p>
              <strong>آخر تحديث:</strong>{" "}
              {new Date(warehouse?.updatedDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة</CardTitle>
          </CardHeader>
          <CardContent className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              onClick={() => {}}
              title="عدد المنتجات"
              value={products?.length || 0}
              icon={PlusCircle}
              loading={productsLoading}
            />
            <StatsCard
              onClick={() => {}}
              title="صندوق اليوم"
              value={totalTodaySales?.toFixed(2) || 0}
              icon={PlusCircle}
              loading={isLoading}
            />
          </CardContent>
        </Card>

        {productsLoading ? (
          <Loading />
        ) : (
          <ProductsDataTable
            productsData={products}
            setEditRow={setEditRow}
            setOpenForm={setOpenForm}
            setOpenTransfare={setOpenTransfare}
            setProductRow={setProductRow}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
