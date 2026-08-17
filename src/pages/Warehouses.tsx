import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Loading from "@/components/ui/custom/Loading";
import AddWarehouse from "@/components/Warehouses/AddWarehouse";
import { useWarehouseContext } from "@/contexts/WarehouseContexts";
import { useState } from "react";
import { Plus, MapPin, Calendar, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Warehouses() {
  const { data: warehouses = [], isLoading } = useWarehouseContext();

  const navigate = useNavigate();

  const [addFormOpen, setAddFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredWarehouses = warehouses.filter((warehouse) =>
    `${warehouse.name} ${warehouse.location || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout>
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <AddWarehouse isOpen={addFormOpen} setIsOpen={setAddFormOpen} />
          <Card>
            {/* ===== Header ===== */}
            <CardHeader className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">المستودعات</h1>
                <p className="text-sm text-muted-foreground">
                  إدارة جميع المستودعات ومتابعة حالتها
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
                    placeholder="ابحث عن مستودع..."
                    className="h-10 w-full rounded-md border bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button onClick={() => setAddFormOpen(true)} className="w-full gap-2 sm:w-auto">
                  <Plus size={18} />
                  إضافة
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {/* ===== Empty State ===== */}
              {warehouses.length === 0 && (
                <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                  <p className="text-lg font-medium">لا يوجد مستودعات بعد</p>
                  <p className="text-sm text-muted-foreground">
                    ابدأ بإضافة أول مستودع لإدارة المخزون
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setAddFormOpen(true)}
                  >
                    إضافة مستودع
                  </Button>
                </div>
              )}

              {filteredWarehouses.length === 0 && (
                <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
                  <p className="text-lg font-medium">
                    لا يوجد مستودعات مطابقة للبحث
                  </p>
                </div>
              )}

              {/* ===== Warehouses Grid ===== */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredWarehouses.map((warehouse) => (
                  <Card
                    onDoubleClick={() => navigate(`/warehouses/${warehouse.id}`)}
                    key={warehouse.id}
                    className="group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="break-words text-lg font-semibold">
                          {warehouse.name}
                        </CardTitle>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={warehouse.isActive ? "default" : "secondary"}
                        >
                          {warehouse.isActive ? "نشط" : "غير نشط"}
                        </Badge>

                        {/* View Details */}
                        <button
                          onClick={() =>
                            navigate(`/warehouses/${warehouse.id}`)
                          }
                          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-primary"
                          title="عرض التفاصيل"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={16} />
                        <span>{warehouse.location || "الموقع غير محدد"}</span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} />
                        <span>
                          إنشاء:{" "}
                          {new Date(warehouse.createdDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={16} />
                        <span>
                          آخر تحديث:{" "}
                          {new Date(warehouse.updatedDate).toLocaleDateString()}
                        </span>
                      </div>
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
