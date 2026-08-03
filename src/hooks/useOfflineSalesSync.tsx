import { useCallback, useEffect, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  clearPendingOfflineSales,
  getPendingOfflineSalesCount,
  syncPendingOfflineSales,
} from "@/services/offlineSales";

export function useOfflineSalesSync(queryClient: QueryClient) {
  const isOnline = useNetworkStatus();
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [isSyncingOfflineSales, setIsSyncingOfflineSales] = useState(false);

  const refreshPendingSalesCount = useCallback(async () => {
    setPendingSalesCount(await getPendingOfflineSalesCount());
  }, []);

  const syncOfflineSales = useCallback(async () => {
    if (!isOnline) {
      await refreshPendingSalesCount();
      return;
    }

    setIsSyncingOfflineSales(true);

    try {
      const result = await syncPendingOfflineSales();
      setPendingSalesCount(result.pending);

      if (result.synced > 0) {
        toast.success(`تم إرسال ${result.synced} فاتورة محفوظة محليا`);
        queryClient.invalidateQueries({ queryKey: ["sells-table"] });
        queryClient.invalidateQueries({ queryKey: ["products-table"] });
        queryClient.invalidateQueries({ queryKey: ["customers-table"] });
      }

      if (result.failed > 0 && result.pending > 0) {
        toast.error("بعض الفواتير المحلية تحتاج مراجعة قبل الإرسال");
      }
    } finally {
      setIsSyncingOfflineSales(false);
    }
  }, [isOnline, queryClient, refreshPendingSalesCount]);

  const clearOfflineSales = useCallback(async () => {
    setIsSyncingOfflineSales(true);

    try {
      await clearPendingOfflineSales();
      setPendingSalesCount(0);
      toast.success("تم تفريغ الفواتير المحلية");
      queryClient.invalidateQueries({ queryKey: ["products-table"] });
      queryClient.invalidateQueries({ queryKey: ["sells-table"] });
    } finally {
      setIsSyncingOfflineSales(false);
    }
  }, [queryClient]);

  useEffect(() => {
    void refreshPendingSalesCount();
  }, [refreshPendingSalesCount]);

  useEffect(() => {
    if (isOnline) {
      void syncOfflineSales();
    }
  }, [isOnline, syncOfflineSales]);

  return {
    isOnline,
    pendingSalesCount,
    isSyncingOfflineSales,
    refreshPendingSalesCount,
    syncOfflineSales,
    clearOfflineSales,
  };
}
