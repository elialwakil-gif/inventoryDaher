import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loading from "@/components/ui/custom/Loading";
import { useProducts } from "@/hooks/useProducts";
import { useProductsGrouping } from "@/hooks/useProductsGrouping";
import { Eye, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Categories = () => {

    const navigate = useNavigate();

    const { isLoading } = useProducts(); 
    const { groupByCategory } = useProductsGrouping();

    const groupedProducts = groupByCategory();

    const [search, setSearch] = useState("");
    
    const filteredCategories = Object.entries(groupedProducts).filter(([category]) =>
      category.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <DashboardLayout>
      {filteredCategories.length === 0 && (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
          <p className="text-lg font-medium">لا يوجد اصناف مطابقة للبحث</p>
        </div>
      )}
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Card>
            {/* ===== Header ===== */}
            <CardHeader className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">الأصناف</h1>
                <p className="text-sm text-muted-foreground">
                  إدارة جميع الأصناف ومتابعة حالتها
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {/* Search */}
                <div className="relative w-full sm:w-[260px]">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث عن صنف..."
                    className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

              </div>
            </CardHeader>

            <CardContent>

              {filteredCategories.length === 0 && (
                <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                  <p className="text-lg font-medium">
                    لا يوجد اصناف مطابقة للبحث
                  </p>
                </div>
              )}

              {/* ===== Categories Grid ===== */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCategories.map(([categoryName, products]) => (
                  <Card
                    onDoubleClick={() =>
                      navigate(`/categories/${categoryName}`, { state: { products } })
                    }
                    key={categoryName}
                    className="group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="break-words text-lg font-semibold">
                          {categoryName}
                        </CardTitle>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          //variant={products[0]?.isActive ? "default" : "secondary"}
                        >
                          {products.length} منتج
                        </Badge>

                        {/* View Details */}
                        <button
                          onClick={() =>
                            navigate(`/categories/${categoryName}`, { state: { products } })
                          }
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-primary"
                          title="عرض التفاصيل"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">

                      {/* <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} />
                        <span>
                          آخر تحديث:{" "}
                          {new Date(warehouse.updatedDate).toLocaleDateString()}
                        </span>
                      </div> */}
                    </CardContent>

                    {/* Hover Accent */}
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-primary scale-x-0 transition-transform group-hover:scale-x-100" />
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

export default Categories
