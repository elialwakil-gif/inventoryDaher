import { DataTable } from '@/components/dashboard/DataTable';
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import getAllCustomer from '@/services/customer';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AddCustomerForm from '@/components/Customers/AddCustomerForm'
import { StatsCard } from '@/components/dashboard/StatsCard';
import { HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Customer() {

    const navigate = useNavigate()
    const [addIsOpen, setAddIsOpen] = useState(false);

    const { data: customer } = useQuery({
        queryKey: ["customers-table"],
        queryFn: getAllCustomer,
    })

    const supplierColumns = [
        { key: "id", label: "الرمز", sortable: true, hidden: true },
        { key: "name", label: "الاسم", sortable: true },
        { key: "number", label: "الرقم", sortable: true },
        { key: "balance", label: "الرصيد", sortable: true },
        { key: "purchasesCount", label: "عدد عمليات الشراء", sortable: true },
        { key: "updatedDate", label: "اخر عملية", sortable: true },
    ];

    const customersDebt = useMemo(()=>{
        return customer
            ?.filter(c => c.balance < 0)
            .reduce((sum, c) => sum + Number(c.balance), 0) || 0;
    }, [customer])

    return (
      <DashboardLayout>
        {/* البطاقات الإحصائية */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="ديون على الزبائن"
            value={-customersDebt.toFixed(2) || 0}
            icon={HandCoins}
          />
        </div>
        <DataTable
          title="الزبائن"
          titleButton={
            <AddCustomerForm
              isOpen={addIsOpen}
              setIsOpen={setAddIsOpen}
              className="w-full mb-2"
            />
          }
          columns={supplierColumns}
          data={
            customer
              ? Object.values(customer).map((supplier) => {
                  if (typeof supplier === "object") {
                    return {
                      ...supplier,
                      purchasesCount: (supplier as any).purchases?.length ?? 0,
                    };
                  }
                  return supplier;
                })
              : []
          }
          onRowClick={(row) => {
            navigate("/customerDetails", {
              state: { id: row.id },
            });
          }}
        />
      </DashboardLayout>
    );
}
