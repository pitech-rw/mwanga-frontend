"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastTone = "info" | "success" | "warning" | "error";

export type ToastInput = {
  title: string;
  message: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & { id: number; tone: ToastTone };

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const item: ToastItem = { ...toast, id, tone: toast.tone ?? "info" };
      setToasts((current) => [item, ...current].slice(0, 4));
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <article key={toast.id} className={`toast ${toast.tone}`}>
            <header>
              <strong>{toast.title}</strong>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                ×
              </button>
            </header>
            <p>{toast.message}</p>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return value;
}
