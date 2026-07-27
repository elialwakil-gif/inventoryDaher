import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AddProductForm from "@/components/Products/AddProductForm";
import ProductsDataTable from "@/components/Products/ProductsDataTable";
import TransfareForm from "@/components/Products/TransfareForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FilterSelection from "@/components/ui/custom/FilterSelection";
import FormInput from "@/components/ui/custom/FormInput";
import Loading from "@/components/ui/custom/Loading";
import { useProductContext } from "@/contexts/ProductContext";
import { getProductAlertLimit } from "@/lib/productStock";
import { Box } from "lucide-react";
import { useState, useMemo } from "react";

export interface ProductTableRow {
  id: string;
  code: string;
  name: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  warehouse: string;
  payPrice?: number;
  wholesalePrice?: number;
  superWholesalePrice?: number;
  sellPrice?: number;
  category: string;
  unit: string;
  alertQuantity?: number;
  lowStockLimit?: number;
  minQuantity?: number;
}

export default function Products() {

  const [openTransfare, setOpenTransfare] = useState(false);
  const [productRow, setProductRow] = useState({});

  const [openForm, setOpenForm] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const { data: products = [], isLoading: productsLoading } = useProductContext();
  const isAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("InventoryUser") || "null")?.role === "admin";
    } catch {
      return false;
    }
  }, []);
  

  // =======================
  // تصفية البيانات
  // =======================
  const filteredData = useMemo(() => {
    if (!products) return [];

    let rows: ProductTableRow[] = products

    if (warehouseFilter !== "all") {
      rows = rows.filter((p) => p.warehouse === warehouseFilter);
    }

    if (categoryFilter !== "all") {
      rows = rows.filter((p) => p.category === categoryFilter);
    }

    if (stockFilter !== "all") {
      rows = rows.filter((p) =>
        stockFilter === "out"
          ? p.quantity === 0
          : p.quantity > 0 && p.quantity <= getProductAlertLimit(p),
      );
    }

    if (onlyLowStock) {
      rows = rows.filter((p) => p.quantity <= getProductAlertLimit(p));
    }

    if (isAdmin) {
      rows = rows.filter(
        (p) =>
          Number(p.sellPrice || 0) >= priceRange[0] &&
          Number(p.sellPrice || 0) <= priceRange[1],
      );
    }

    return rows.map((product) => ({
      ...product,
      reservedQuantity: Number(product.reservedQuantity || 0),
      availableQuantity: Math.max(
        Number(product.quantity || 0) - Number(product.reservedQuantity || 0),
        0,
      ),
      alertQuantity: getProductAlertLimit(product),
    }));
  }, [
    products,
    warehouseFilter,
    categoryFilter,
    stockFilter,
    onlyLowStock,
    priceRange,
    isAdmin,
  ]);

  const totalProductsBalance = filteredData.reduce(
    (sum, product) =>
      sum + Number(product.payPrice || 0) * Number(product.quantity || 0),
    0,
  );


  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div dir="rtl" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            onClick={() => {}}
            title="اجماري رصيد المنتجات"
            value={totalProductsBalance.toFixed(2) || 0}
            icon={Box}
            onlyAdmin={true}
          />
        </div>
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

        {/* ======= فلاتر احترافية ======= */}
        <Card>
          <CardHeader>
            <CardTitle>الفلاتر</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FilterSelection
              DataToFilter={products}
              selectedFilter={categoryFilter}
              setSelectedFilter={setCategoryFilter}
              FilterBy="category"
              Placeholder="اختر الصنف"
            />

            <FilterSelection
              DataToFilter={products}
              selectedFilter={warehouseFilter}
              setSelectedFilter={setWarehouseFilter}
              FilterBy="warehouse"
              Placeholder="اختر المستودع"
            />

            {/* <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
              />
              المخزون الحرج فقط
            </label> */}

            {isAdmin && (
            <div className="flex w-full items-center gap-2">
              <span>السعر:</span>
              <FormInput
                label=""
                type="number"
                className="border rounded px-2 py-1"
                value={priceRange[0]}
                onChange={(e) =>
                  setPriceRange([Number(e.target.value), priceRange[1]])
                }
                placeholder="min"
              />
              -
              <FormInput
                label=""
                type="number"
                className="border rounded px-2 py-1"
                value={priceRange[1]}
                onChange={(e) =>
                  setPriceRange([priceRange[0], Number(e.target.value)])
                }
                placeholder="max"
              />
            </div>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setWarehouseFilter("all");
                setCategoryFilter("all");
                setStockFilter("all");
                setOnlyLowStock(false);
                setPriceRange([0, 100000]);
              }}
            >
              إعادة تعيين الفلاتر
            </Button>
          </CardContent>
        </Card>

        {/* ======= الجدول ======= */}
        {productsLoading ? (
          <Loading />
        ) : (
          <ProductsDataTable
            productsData={filteredData}
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
