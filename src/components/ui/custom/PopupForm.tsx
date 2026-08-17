import { ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type PopupFormProps = {
  title?: string;
  trigger: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
};

export default function PopupForm({
  title = "نموذج",
  trigger,
  children,
  isOpen,
  setIsOpen,
}: PopupFormProps) {
  return (
    <>
      {/* الزر المحفز */}
      <div
        onClick={() => setIsOpen(true)}
        className="inline-block w-full cursor-pointer sm:w-auto"
      >
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* الخلفية */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* محتوى البوب أب */}
            <motion.div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-4 sm:py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-hidden rounded-xl bg-gradient-to-bl from-primary-50 to-background p-4 shadow-xl sm:rounded-2xl sm:p-6"
                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 className="break-words text-lg font-semibold text-foreground sm:text-xl">
                    {title}
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="shrink-0 text-gray-400 transition hover:text-red-500"
                    aria-label="إغلاق"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* المحتوى */}
                <div className="max-h-[calc(100dvh-8rem)] space-y-4 overflow-y-auto overflow-x-hidden p-1">
                  {children}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
