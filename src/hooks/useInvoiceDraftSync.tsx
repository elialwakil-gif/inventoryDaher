import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  clearMyInvoiceDraft,
  createEmptyInvoiceDraft,
  getMyInvoiceDraft,
  InvoiceDraft,
  InvoiceDraftUpdate,
  normalizeInvoiceDraft,
  updateMyInvoiceDraft,
} from "@/services/invoiceDraft";
import {
  disconnectInvoiceDraftSocket,
  getInvoiceDraftSocket,
} from "@/lib/invoiceDraftSocket";
import {
  getOfflineCache,
  isBrowserOnline,
  setOfflineCache,
} from "@/lib/offlineStore";
import { offlineCacheKeys } from "@/services/offlineSales";

type DraftUpdater = InvoiceDraft | ((current: InvoiceDraft) => InvoiceDraft);

interface UpdateOptions {
  immediate?: boolean;
}

interface ClearDraftOptions {
  localOnly?: boolean;
}

const getSocketDraft = (payload: any) =>
  normalizeInvoiceDraft(payload?.draft || payload?.data || payload || null);

const createClientId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const toTimestamp = (value: unknown) => {
  const timestamp = new Date(String(value || "")).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const shouldIgnoreIncomingDraft = (
  currentDraft: InvoiceDraft,
  incomingDraft: InvoiceDraft,
) => {
  const currentVersion = Number(currentDraft.version || 0);
  const incomingVersion = Number(incomingDraft.version || 0);

  if (currentVersion && incomingVersion && incomingVersion < currentVersion) {
    return true;
  }

  const currentUpdatedAt = toTimestamp(currentDraft.updatedAt);
  const incomingUpdatedAt = toTimestamp(incomingDraft.updatedAt);

  return Boolean(
    currentUpdatedAt &&
      incomingUpdatedAt &&
      incomingUpdatedAt < currentUpdatedAt,
  );
};

const markLocalDraftWrite = (draft: InvoiceDraft): InvoiceDraft => {
  const normalizedDraft = normalizeInvoiceDraft(draft);

  return {
    ...normalizedDraft,
    clearedAt: undefined,
    updatedAt: new Date().toISOString(),
  };
};

export function useInvoiceDraftSync() {
  const [draft, setDraftState] = useState<InvoiceDraft>(
    createEmptyInvoiceDraft,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState("");

  const draftRef = useRef(draft);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localRevisionRef = useRef(0);
  const clientIdRef = useRef(createClientId());
  const hasShownSyncErrorRef = useRef(false);

  const applyDraft = useCallback((nextDraft: InvoiceDraft) => {
    const normalizedDraft = normalizeInvoiceDraft(nextDraft);
    draftRef.current = normalizedDraft;
    setDraftState(normalizedDraft);
    void setOfflineCache(offlineCacheKeys.invoiceDraft, normalizedDraft);
  }, []);

  const showSyncError = useCallback(() => {
    if (hasShownSyncErrorRef.current) {
      return;
    }

    hasShownSyncErrorRef.current = true;
    toast.error("تعذر مزامنة مسودة الفاتورة مع السيرفر");
  }, []);

  const emitDraftUpdate = useCallback(
    (nextDraft: InvoiceDraft, alreadySaved = false) => {
      const socket = getInvoiceDraftSocket();
      socket.emit("invoice-draft:update", {
        clientId: clientIdRef.current,
        draft: nextDraft,
        alreadySaved,
      });
    },
    [],
  );

  const syncNow = useCallback(
    async (nextDraft: InvoiceDraft, revision: number) => {
      setIsSyncing(true);
      setSyncError("");

      try {
        const savedDraft = await updateMyInvoiceDraft(nextDraft);

        if (revision === localRevisionRef.current) {
          applyDraft(savedDraft);
        }

        hasShownSyncErrorRef.current = false;
        setLastSyncedAt(new Date());
        emitDraftUpdate(savedDraft, true);
      } catch (error) {
        console.error("Invoice draft sync failed:", error);
        setSyncError("تعذر حفظ آخر تعديل على مسودة الفاتورة");
        showSyncError();
        emitDraftUpdate(nextDraft);
      } finally {
        setIsSyncing(false);
      }
    },
    [applyDraft, emitDraftUpdate, showSyncError],
  );

  const scheduleSync = useCallback(
    (nextDraft: InvoiceDraft, revision: number, immediate = false) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      if (!isBrowserOnline()) {
        void setOfflineCache(offlineCacheKeys.invoiceDraft, nextDraft);
        setSyncError("تم حفظ مسودة الفاتورة محليا لحين عودة الاتصال");
        setLastSyncedAt(new Date());
        return;
      }

      if (immediate) {
        void syncNow(nextDraft, revision);
        return;
      }

      saveTimerRef.current = setTimeout(() => {
        void syncNow(nextDraft, revision);
      }, 350);
    },
    [syncNow],
  );

  const updateDraft = useCallback(
    (updater: DraftUpdater, options?: UpdateOptions) => {
      setDraftState((currentDraft) => {
        const nextDraft =
          typeof updater === "function" ? updater(currentDraft) : updater;
        const normalizedDraft = markLocalDraftWrite(nextDraft);
        const nextRevision = localRevisionRef.current + 1;

        localRevisionRef.current = nextRevision;
        draftRef.current = normalizedDraft;
        scheduleSync(normalizedDraft, nextRevision, options?.immediate);

        return normalizedDraft;
      });
    },
    [scheduleSync],
  );

  const patchDraft = useCallback(
    (patch: InvoiceDraftUpdate, options?: UpdateOptions) => {
      updateDraft((currentDraft) => ({ ...currentDraft, ...patch }), options);
    },
    [updateDraft],
  );

  const reloadDraft = useCallback(async () => {
    setIsLoading(true);
    setSyncError("");

    try {
      if (!isBrowserOnline()) {
        const localDraft = await getOfflineCache<InvoiceDraft>(
          offlineCacheKeys.invoiceDraft,
        );

        applyDraft(localDraft || createEmptyInvoiceDraft());
        setSyncError("تعمل حاليا على مسودة محفوظة محليا");
        return;
      }

      const serverDraft = await getMyInvoiceDraft();
      applyDraft(serverDraft);
      hasShownSyncErrorRef.current = false;
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error("Invoice draft load failed:", error);
      const localDraft = await getOfflineCache<InvoiceDraft>(
        offlineCacheKeys.invoiceDraft,
      );

      if (localDraft) {
        applyDraft(localDraft);
        setSyncError("تم تحميل آخر مسودة محفوظة محليا");
      } else {
        setSyncError("تعذر تحميل مسودة الفاتورة");
        showSyncError();
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyDraft, showSyncError]);

  const clearDraft = useCallback(async (options?: ClearDraftOptions) => {
    const emptyDraft = {
      ...createEmptyInvoiceDraft(),
      updatedAt: new Date().toISOString(),
    };
    localRevisionRef.current += 1;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    applyDraft(emptyDraft);
    await setOfflineCache(offlineCacheKeys.invoiceDraft, emptyDraft);

    if (options?.localOnly) {
      setLastSyncedAt(new Date());
      return;
    }

    setIsSyncing(true);
    setSyncError("");

    try {
      const serverDraft = await clearMyInvoiceDraft();
      applyDraft(serverDraft);
      hasShownSyncErrorRef.current = false;
      setLastSyncedAt(new Date());
      getInvoiceDraftSocket().emit("invoice-draft:clear", {
        clientId: clientIdRef.current,
        draft: serverDraft,
        alreadySaved: true,
      });
    } catch (error) {
      console.error("Invoice draft clear failed:", error);
      setSyncError("تعذر تفريغ مسودة الفاتورة");
      showSyncError();
      emitDraftUpdate(emptyDraft);
    } finally {
      setIsSyncing(false);
    }
  }, [applyDraft, emitDraftUpdate, showSyncError]);

  useEffect(() => {
    const socket = getInvoiceDraftSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("invoice-draft:join");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleDraftChanged = (payload: any) => {
      if (payload?.clientId === clientIdRef.current) {
        return;
      }

      const incomingDraft = getSocketDraft(payload);

      if (shouldIgnoreIncomingDraft(draftRef.current, incomingDraft)) {
        return;
      }

      applyDraft(incomingDraft);
      setLastSyncedAt(new Date());
    };

    const handleDraftCleared = (payload: any) => {
      if (payload?.clientId === clientIdRef.current) {
        return;
      }

      const incomingDraft = getSocketDraft(
        payload?.draft || createEmptyInvoiceDraft(),
      );

      if (shouldIgnoreIncomingDraft(draftRef.current, incomingDraft)) {
        return;
      }

      applyDraft(incomingDraft);
      setLastSyncedAt(new Date());
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("invoice-draft:changed", handleDraftChanged);
    socket.on("invoice-draft:updated", handleDraftChanged);
    socket.on("invoice-draft:clear", handleDraftCleared);
    socket.on("invoice-draft:cleared", handleDraftCleared);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("invoice-draft:changed", handleDraftChanged);
      socket.off("invoice-draft:updated", handleDraftChanged);
      socket.off("invoice-draft:clear", handleDraftCleared);
      socket.off("invoice-draft:cleared", handleDraftCleared);

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      disconnectInvoiceDraftSocket();
    };
  }, [applyDraft]);

  useEffect(() => {
    void reloadDraft();
  }, [reloadDraft]);

  return {
    draft,
    isConnected,
    isLoading,
    isSyncing,
    lastSyncedAt,
    syncError,
    updateDraft,
    patchDraft,
    reloadDraft,
    clearDraft,
  };
}
