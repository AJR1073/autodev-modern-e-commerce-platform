"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options?: SelectOption[];
  placeholder?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options = [],
      placeholder,
      error,
      disabled,
      required,
      value,
      defaultValue,
      children,
      ...props
    },
    ref,
  ) => {
    const hasPlaceholder = Boolean(placeholder);
    const resolvedValue =
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : hasPlaceholder ? "" : undefined;

    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            disabled={disabled}
            required={required}
            value={value}
            defaultValue={value === undefined ? resolvedValue : undefined}
            aria-invalid={error ? "true" : "false"}
            {...props}
          >
            {hasPlaceholder ? (
              <option value="" disabled={required}>
                {placeholder}
              </option>
            ) : null}
            {children
              ? children
              : options.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
          </select>

          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        {error ? (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";

export { Select };
