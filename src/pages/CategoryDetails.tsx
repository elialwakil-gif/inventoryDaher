import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AddProductForm from "@/components/Products/AddProductForm";
import ProductsDataTable from "@/components/Products/ProductsDataTable";
import TransfareForm from "@/components/Products/TransfareForm";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ProductTableRow } from "./Products";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import CardContent from "@mui/material/CardContent";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BoxesIcon } from "lucide-react";
import { ChartContainer } from "@/components/dashboard/ChartContainer";
import FilterSelection from "@/components/ui/custom/FilterSelection";
import { useProductContext } from "@/contexts/ProductContext";

const CategoryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { data: allProducts } = useProductContext();
  const products = allProducts
    ? allProducts.filter((product) => product.category === id)
    : location.state?.products || [];

  const [openTransfare, setOpenTransfare] = useState(false);
  const [productRow, setProductRow] = useState({});

  const [openForm, setOpenForm] = useState(false);
  const [editRow, setEditRow] = useState<any | null>(null);

    const [warehouseFilter, setWarehouseFilter] = useState("all");

  const filteredData = useMemo(() => {
      if (!products) return [];
  
      let rows: ProductTableRow[] = products
  
      if (warehouseFilter !== "all") {
        rows = rows.filter((p) => p.warehouse === warehouseFilter);
      }
  
      return rows;
    }, [
      products,
      warehouseFilter,
    ]);
  

    const pieData = Object.values(products || {}).reduce(
      (acc: Record<string, number>, prod: any) => {
        
        if (!acc[prod.warehouse]) acc[prod.warehouse] = 0;
        acc[prod.warehouse] += 1; // كل مرة يظهر المنتج نزيد 1
        return acc;
      },
      {},
    );

  const pieChartData = Object.entries(pieData)
    ?.slice(0, 5)
    ?.map(([name, value]) => ({
      name,
      value,
    }));
   
    const mostQuntityData = Object.values(filteredData || {}).reduce(
      (acc: Record<string, number>, prod: any) => {
        if (!acc[prod.name]) acc[prod.name] = 0;
        acc[prod.name] += prod.quantity;
        return acc;
      },
      {},
    );

  const barChartData = Object.entries(mostQuntityData).sort((a, b) => b[1] - a[1])
    ?.slice(0, 7)
    ?.map(([name, value]) => ({
      name,
      value,
    }));

  return (
    <DashboardLayout>
      <AddProductForm isOpen={openForm} setIsOpen={setOpenForm} row={editRow} />
      <TransfareForm
        isOpen={openTransfare}
        setIsOpen={setOpenTransfare}
        row={productRow as ProductTableRow}
      />

      <Card>
        <CardHeader>
          <CardTitle>{id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterSelection
            DataToFilter={products}
            selectedFilter={warehouseFilter}
            setSelectedFilter={setWarehouseFilter}
            FilterBy="warehouse"
            Placeholder="اختر المستودع"
          />
          <StatsCard
            title="عدد المنتجات"
            value={filteredData?.length || 0}
            icon={BoxesIcon}
          />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <ChartContainer
              title="توزيع المنتجات حسب المخازن"
              data={pieChartData ? (pieChartData as any[]) : []}
              type="pie"
              dataKey="value"
            />

            <ChartContainer
              title="أكثر المنتجات كمية"
              data={barChartData ? (barChartData as any[]) : []}
              type="bar"
              dataKey="value"
            />
          </div>
        </CardContent>
      </Card>

      <ProductsDataTable
        productsData={products}
        setEditRow={setEditRow}
        setOpenForm={setOpenForm}
        setOpenTransfare={setOpenTransfare}
        setProductRow={setProductRow}
      />
    </DashboardLayout>
  );
};

export default CategoryDetails;
