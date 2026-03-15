"use client";

import { Toaster as SonnerToaster } from "sonner";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group border border-slate-200 bg-white text-slate-950 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50",
          title: "text-sm font-semibold",
          description: "text-sm text-slate-600 dark:text-slate-300",
          actionButton:
            "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200",
          cancelButton:
            "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700",
          success:
            "border-emerald-200 dark:border-emerald-900/60",
          error:
            "border-rose-200 dark:border-rose-900/60",
          warning:
            "border-amber-200 dark:border-amber-900/60",
          info:
            "border-sky-200 dark:border-sky-900/60",
        },
      }}
      {...props}
    />
  );
}