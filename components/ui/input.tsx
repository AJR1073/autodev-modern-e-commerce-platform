import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error = false, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-950 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-red-500 focus-visible:ring-red-500"
            : "border-slate-200 focus-visible:border-slate-400 focus-visible:ring-slate-900/20",
          "dark:bg-slate-950 dark:text-slate-50 dark:file:text-slate-50 dark:placeholder:text-slate-400",
          error
            ? "dark:border-red-500 dark:focus-visible:ring-red-500"
            : "dark:border-slate-800 dark:focus-visible:border-slate-700 dark:focus-visible:ring-slate-300/20",
          disabled && "bg-slate-50 dark:bg-slate-900",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };