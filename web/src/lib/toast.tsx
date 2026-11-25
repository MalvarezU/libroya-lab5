"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => remove(id), 3500);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift backdrop-blur ${
              t.type === "success"
                ? "border-success/30 bg-success/15 text-success"
                : t.type === "error"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-border bg-surface text-ink-950"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-current/60 hover:text-current">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}