"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const DEFAULT_RICH_COLORS = true;
const DEFAULT_CLOSE_BUTTON = true;
const DEFAULT_POSITION: ToasterProps["position"] = "top-right";

export function SonnerToaster({
  theme = "system",
  richColors = DEFAULT_RICH_COLORS,
  closeButton = DEFAULT_CLOSE_BUTTON,
  position = DEFAULT_POSITION,
  toastOptions,
  ...props
}: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      richColors={richColors}
      closeButton={closeButton}
      position={position}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-slate-200 bg-white text-slate-950 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
          title: "text-sm font-semibold",
          description: "text-sm text-slate-600 dark:text-slate-300",
          actionButton:
            "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200",
          cancelButton:
            "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
          success:
            "border-emerald-200 dark:border-emerald-900/60 [&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400",
          error:
            "border-rose-200 dark:border-rose-900/60 [&_[data-icon]]:text-rose-600 dark:[&_[data-icon]]:text-rose-400",
          warning:
            "border-amber-200 dark:border-amber-900/60 [&_[data-icon]]:text-amber-600 dark:[&_[data-icon]]:text-amber-400",
          info: "border-sky-200 dark:border-sky-900/60 [&_[data-icon]]:text-sky-600 dark:[&_[data-icon]]:text-sky-400",
          ...toastOptions?.classNames,
        },
        ...toastOptions,
      }}
      {...props}
    />
  );
}

export { SonnerToaster as Toaster };