import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { ReactNode } from "react";

interface ConfirmFFormProps {
  /** الزر الذي يفتح الـ dialog */
  trigger: ReactNode;

  /** عنوان التأكيد */
  title: string;

  /** وصف الإجراء */
  description?: string;

  /** نص زر التأكيد */
  confirmText?: string;

  /** نص زر الإلغاء */
  cancelText?: string;

  /** عند الضغط على تأكيد */
  onConfirm: () => void;

  /** حالة تحميل */
  loading?: boolean;

  /** تعطيل الزر */
  disabled?: boolean;

  /** class مخصص لزر التأكيد */
  confirmClassName?: string;
}

export default function ConfirmForm({
  trigger,
  title,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onConfirm,
  loading = false,
  disabled = false,
  confirmClassName = "bg-red-600 hover:bg-red-700",
}: ConfirmFFormProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {trigger}
      </AlertDialogTrigger>

      <AlertDialogContent
        className="w-[calc(100vw-2rem)] max-w-md rounded-xl"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>

          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={confirmClassName}
          >
            {loading ? "جارٍ التنفيذ..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
