// Tiny app-wide toast notifications. Call toast.success("Saved") from any
// client component; <Toaster /> (mounted once in app/layout.tsx) shows it.
// Gives every action immediate visible confirmation instead of only
// reporting errors.

export type ToastKind = "success" | "error" | "info";

export interface ToastDetail {
  kind: ToastKind;
  message: string;
}

export const TOAST_EVENT = "app:toast";

const emit = (kind: ToastKind, message: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { kind, message } })
  );
};

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
  info: (message: string) => emit("info", message),
};
