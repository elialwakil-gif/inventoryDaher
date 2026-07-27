import React, { useState  } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/dashboard/DataTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PopupForm from '@/components/ui/custom/PopupForm'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Plus, Edit, Trash2 , Info, Database, RefreshCw } from 'lucide-react'
import AddAccountForm from '@/components/Accounts/AddAccountForm'
import UpdateAccountForm from '@/components/Accounts/UpdateAccountForm'
import { useGetAccount, useDeleteAccount } from '@/hooks/useAccount'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
    previewCurrencyMigration,
    runCurrencyMigration,
    CurrencyMigrationSummary,
} from '@/services/currencyMigration'
import { queryKeys } from '@/lib/queryKeys'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ChartAccount() {
    const [isOpen, setIsOpen] = useState(false)
    const [isUpdateOpen, setIsUpdateOpen] = useState(false)
    const [selectedAccount, setSelectedAccount] = useState(null)
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const formatMigrationSummary = (summary: CurrencyMigrationSummary) =>
        `بيع ${summary.sells}، شراء ${summary.purchases}، دفعات ${summary.payments}، حسابات ${summary.accounts}، عملاء ${summary.customers}، موردون ${summary.suppliers}`;

    const previewMigration = useMutation({
        mutationFn: previewCurrencyMigration,
        onSuccess: (summary) => {
            toast({
                title: 'معاينة الترحيل',
                description: formatMigrationSummary(summary),
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'خطأ',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const executeMigration = useMutation({
        mutationFn: runCurrencyMigration,
        onSuccess: (summary) => {
            queryClient.invalidateQueries({ queryKey: ['financial-operations'] });
            queryClient.invalidateQueries({ queryKey: ['profit-analysis'] });
            queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
            toast({
                title: 'تم ترحيل العملات',
                description: formatMigrationSummary(summary),
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'خطأ',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const accountColumns = [
        { label: 'المعرف', key: 'id', hidden: true },
        { label: 'الاسم', key: 'name', sortable: true },
        { label: 'الرمز', key: 'code', sortable: true },
        { label: 'النوع', key: 'type', sortable: true },
        { label: 'الفئة', key: 'category', sortable: true },
        { label: 'الرصيد الافتتاحي', key: 'openingBalance', sortable: true },
        { label: 'الرصيد الحالي', key: 'currentBalance', sortable: true },
        { label: 'الرصيد USD', key: 'currentBalanceUSD', sortable: true },
        { label: 'الرصيد SYP', key: 'currentBalanceSYP', sortable: true },
        { label: 'العملة', key: 'currency', sortable: true },
        { label: 'الوصف', key: 'description', sortable: true },
    ]
    const { data: accounts, isLoading, error } = useGetAccount()
    const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount()

    const handleUpdate = (account: any) => {
        setSelectedAccount(account)
        setIsUpdateOpen(true)
    }

    const handleDelete = (accountId: string) => {
        deleteAccount(accountId)
    }

    const handleCloseUpdate = () => {
        setIsUpdateOpen(false)
        setSelectedAccount(null)
    }
    const handleInfo = async (id)=>{
        navigate(`/accounts/${id}`)
    }

    if(isLoading)
        return <h1 className='flex justify-center items-center'>loading</h1>
    if (error) {
        console.log(error)
    }


    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* رأس الصفحة */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            دليل الحسابات
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            إدارة وتنظيم الحسابات
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        disabled={previewMigration.isPending}
                        onClick={() => previewMigration.mutate()}
                    >
                        <Database className="h-4 w-4" />
                        معاينة ترحيل العملات
                    </Button>
                    <Button
                        variant="secondary"
                        className="gap-2"
                        disabled={executeMigration.isPending}
                        onClick={() => {
                            if (window.confirm('هل تريد تشغيل ترحيل العملات وتحديث البيانات القديمة؟')) {
                                executeMigration.mutate();
                            }
                        }}
                    >
                        <RefreshCw className="h-4 w-4" />
                        تشغيل الترحيل
                    </Button>
                    <PopupForm
                        isOpen={isOpen}
                        setIsOpen={setIsOpen}
                        title="إضافة حساب جديد"
                        trigger={
                            <Button className="w-full gap-2 sm:w-auto">
                                <Plus className="h-4 w-4" />
                                إضافة حساب
                            </Button>
                        }
                    >
                        <AddAccountForm />
                    </PopupForm>
                    </div>
                </div>

                {/* نافذة تحديث الحساب */}
                {selectedAccount && (
                    <PopupForm
                        isOpen={isUpdateOpen}
                        setIsOpen={setIsUpdateOpen}
                        title="تحديث الحساب"
                        trigger=''
                    >
                        <UpdateAccountForm
                            account={selectedAccount}
                            onClose={handleCloseUpdate}
                        />
                    </PopupForm>
                )}

                {/* جدول البيانات */}
                <Card className="shadow-sm">
                    <div className="overflow-hidden">
                        <DataTable
                            columns={accountColumns}
                            data={accounts}
                            title="جدول ادارة المكتب"
                            renderRowActions={(row) => (
                                <div className="flex gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleUpdate(row)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Edit className="h-4 w-4 mr-1" />
                                        تحديث
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleInfo(row.id)}
                                    >
                                        <Info className="h-4 w-4 mr-1" />
                                        التفاصيل
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                disabled={isDeleting}
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                حذف
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    هل أنت متأكد من حذف الحساب "{row.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(row.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    حذف
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )}
                        />
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    )
}
