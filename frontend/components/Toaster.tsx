"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";

interface ActiveToast extends ToastDetail {
  id: number;
}

const STYLE: Record<ToastDetail["kind"], string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-blue-900 text-white",
};

const ICON: Record<ToastDetail["kind"], string> = {
  success: "M5 13l4 4L19 7",
  error: "M6 18L18 6M6 6l12 12",
  info: "M13 16h-1v-4h-1m1-4h.01",
};

// Bottom-right stack of short confirmations. Each disappears after ~3.5s
// or when clicked. Announced to screen readers via aria-live.
export default function Toaster() {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  useEffect(() => {
    let nextId = 1;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-3), { ...detail, id }]);
      window.setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3500
      );
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto z-[100] flex flex-col gap-2 items-stretch sm:items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          className={`pointer-events-auto flex items-center gap-2 min-h-10 px-4 py-2.5 rounded-md shadow-lg text-sm font-medium text-left sm:max-w-sm animate-[toast-in_150ms_ease-out] ${STYLE[t.kind]}`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={ICON[t.kind]} />
          </svg>
          {t.message}
        </button>
      ))}
    </div>
  );
}
