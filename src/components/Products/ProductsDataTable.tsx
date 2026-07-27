import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { DataTable } from "../dashboard/DataTable";
import { Button } from "../ui/button";
import { Product } from "@/services/transaction";
import { getProductAlertLimit } from "@/lib/productStock";
import type { ProductTableRow } from "@/pages/Products";
import BulkPriceIncreaseForm from "./BulkPriceIncreaseForm";

type productDataTableProp = {
  productsData: Product[] | ProductTableRow[];
  setEditRow: any;
  setOpenForm: any;
  setProductRow: any;
  setOpenTransfare: any;
  isLoading?: boolean
};

const ProductsDataTable = ({ productsData, setEditRow, setOpenForm, setOpenTransfare, setProductRow, isLoading }: productDataTableProp) => {
  const navigate = useNavigate();
  const [openBulkPriceIncrease, setOpenBulkPriceIncrease] = useState(false);
  const isAdmin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("InventoryUser") || "null")?.role === "admin";
    } catch {
      return false;
    }
  }, []);
  const ProductsColumns = [
    { key: "id", label: "المعرف", sortable: true, hidden: true },
    { key: "code", label: "الرمز", sortable: true },
    { key: "name", label: "الاسم", sortable: true },
    { key: "quantity", label: "الكمية", sortable: true },
    { key: "reservedQuantity", label: "المحجوز", sortable: true },
    { key: "availableQuantity", label: "المتاح", sortable: true },
    { key: "alertQuantity", label: "حد التنبيه", sortable: true },
    { key: "warehouse", label: "المخزن", sortable: true },
    { key: "payPrice", label: "سعر الشراء", sortable: true, onlyAdmin: true },
    { key: "wholesalePrice", label: "سعر الجملة", sortable: true, onlyAdmin: true },
    { key: "superWholesalePrice", label: "سعر جملة الجملة", sortable: true, onlyAdmin: true },
    { key: "sellPrice", label: "سعر المبيع", sortable: true, onlyAdmin: true },
    { key: "category", label: "الصنف", sortable: true },
    { key: "unit", label: "الواحدة", sortable: true },
  ];

  return (
    <>
      <DataTable
        isLoading={isLoading}
        title="قائمة المنتجات"
        titleButton={
          <div className="flex flex-row gap-2">
          <Button
            onClick={() => {
              setEditRow(null);
              setOpenForm(true);
            }}
            className=""
          >
            إضافة منتج
          </Button>
          {isAdmin && (
            <>
          <Button
            variant="outline"
            onClick={() => setOpenBulkPriceIncrease(true)}
           >
            زيادة الاسعار بنسبة محددة
          </Button>
          <BulkPriceIncreaseForm
            isOpen={openBulkPriceIncrease}
            setIsOpen={setOpenBulkPriceIncrease}
            productsData={productsData}
          />
            </>
          )}
          </div>
          
        }
        columns={ProductsColumns}
        data={productsData}
        getRowClassName={(row) =>
          Number(row.availableQuantity ?? row.quantity) === 0
            ? "bg-destructive/20 hover:bg-destructive/40"
            : Number(row.availableQuantity ?? row.quantity) <= getProductAlertLimit(row)
              ? "bg-yellow-500/20 hover:bg-yellow-500/40"
              : ""
        }
        renderRowActions={(row) => (
          <div className="flex gap-1">
            <Button
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                setEditRow(row);
                setOpenForm(true);
              }}
            >
              شراء
            </Button>

            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/productDetails", { state: row });
              }}
            >
              التفاصيل
            </Button>

            <Button
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                setProductRow(row);
                setOpenTransfare(true);
              }}
            >
              نقل
            </Button>
          </div>
        )}
      />
    </>
  );
};

export default ProductsDataTable
