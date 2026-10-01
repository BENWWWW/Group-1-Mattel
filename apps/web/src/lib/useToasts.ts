"use client";

import { useCallback, useState } from "react";

export type ToastKind = "success" | "error" | "info";
export interface Toast { id: string; message: string; type: ToastKind; }

// Toast queue shared by every page; each page renders `toasts` in its own style.
export function useToasts(durationMs = 3500, defaultType: ToastKind = "success") {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const triggerToast = useCallback((message: string, type: ToastKind = defaultType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs);
  }, [durationMs, defaultType]);
  return { toasts, triggerToast };
}
