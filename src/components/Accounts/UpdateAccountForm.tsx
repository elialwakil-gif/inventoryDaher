import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import FormInput from '@/components/ui/custom/FormInput'
import { useUpdateAccount } from '@/hooks/useAccount'

interface UpdateAccountFormProps {
    account: any;
    onClose: () => void;
}

export default function UpdateAccountForm({ account, onClose }: UpdateAccountFormProps) {
    const [formData, setFormData] = useState({
        name: account.name,
        code: account.code,
        type: account.type,
        category: account.category,
        openingBalance: account.openingBalance.toString(),
        currency: account.currency,
        description: account.description,
    })

    const [errors, setErrors] = useState<Record<string, string>>({})
    const { mutate: updateAccount, isPending } = useUpdateAccount()

    const accountTypes = [
        { id: 'Asset', name: 'أصل' },
        { id: 'Liability', name: 'التزام' },
        { id: 'Equity', name: 'حقوق الملكية' },
        { id: 'Revenue', name: 'إيراد' },
        { id: 'Expense', name: 'مصروف' },
    ]

    const categories = [
        { id: 'Cash', name: 'النقد' },
        { id: 'Bank', name: 'البنك' },
        { id: 'Inventory', name: 'المخزون' },
        { id: 'AccountsReceivable', name: 'ذمم مدينة' },
        { id: 'AccountsPayable', name: 'ذمم دائنة' },
        { id: 'Other', name: 'أخرى' },
    ]

    const currencies = [
        { id: 'USD', name: 'دولار أمريكي' },
        { id: 'SYP', name: 'ليرة سورية' },
        { id: 'SAR', name: 'ريال سعودي' },
    ]

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }))

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: '',
            }))
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.name.trim()) newErrors.name = 'الاسم مطلوب'
        if (!formData.code.trim()) newErrors.code = 'الرمز مطلوب'
        if (!formData.type) newErrors.type = 'النوع مطلوب'
        if (!formData.category) newErrors.category = 'الفئة مطلوبة'

        if (
            formData.openingBalance &&
            isNaN(Number(formData.openingBalance))
        ) {
            newErrors.openingBalance = 'الرصيد يجب أن يكون رقماً'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) return

        const payload = {
            name: formData.name.trim(),
            code: formData.code.trim(),
            type: formData.type,
            category: formData.category,
            currentBalance: Number(formData.openingBalance || 0),
            currency: formData.currency,
            description: formData.description.trim() || '',
        }

        updateAccount(
            { id: account.id, formData: payload },
            {
                onSuccess: () => {
                    onClose()
                }
            }
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <FormInput
                    label="اسم الحساب"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="مثال: حساب البنك الأهلي"
                    error={errors.name}
                />
            </div>

            <div>
                <FormInput
                    label="رمز الحساب"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="مثال: 1001"
                    error={errors.code}
                />
            </div>

            <div>
                <FormInput
                    label="نوع الحساب"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    options={accountTypes}
                    error={errors.type}
                />
            </div>

            <div>
                <FormInput
                    label="فئة الحساب"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    options={categories}
                    error={errors.category}
                />
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                    <FormInput
                        label="الرصيد الافتتاحي"
                        name="openingBalance"
                        type="number"
                        value={formData.openingBalance}
                        onChange={handleChange}
                        placeholder="0.00"
                        error={errors.openingBalance}
                    />
                </div>

                <div>
                    <label className="block mb-1 text-sm font-medium text-foreground">
                        العملة
                    </label>
                    <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                    >
                        {currencies.map((curr) => (
                            <option key={curr.id} value={curr.id}>
                                {curr.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block mb-1 text-sm font-medium text-foreground">
                    الوصف
                </label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="أضف وصفاً للحساب (اختياري)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right resize-none"
                />
            </div>

            <div className="flex gap-2 justify-end pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    loading={isPending}
                >
                    إلغاء
                </Button>
                <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isPending}
                >
                    {isPending ? 'جاري التحديث...' : 'تحديث الحساب'}
                </Button>
            </div>
        </form>
    )
}
