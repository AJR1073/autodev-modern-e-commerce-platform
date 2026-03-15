import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4",
  {
    variants: {
      variant: {
        default:
          "border-slate-200 bg-white text-slate-950 [&>svg]:text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:[&>svg]:text-slate-400",
        destructive:
          "border-red-200 bg-red-50 text-red-950 [&>svg]:text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100 dark:[&>svg]:text-red-400",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-950 [&>svg]:text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100 dark:[&>svg]:text-emerald-400",
        warning:
          "border-amber-200 bg-amber-50 text-amber-950 [&>svg]:text-amber-600 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:[&>svg]:text-amber-400",
        info: "border-blue-200 bg-blue-50 text-blue-950 [&>svg]:text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };