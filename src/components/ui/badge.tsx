import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status variants
        success: "border-transparent bg-bsg-green text-white",
        warning: "border-transparent bg-amber-500 text-white",
        danger: "border-transparent bg-red-500 text-white",
        info: "border-transparent bg-bsg-blue text-white",
        // Active/Inactive status
        active: "border-transparent bg-bsg-green/20 text-bsg-green",
        inactive: "border-transparent bg-muted text-muted-foreground",
        // Role variants
        admin: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        coordinator: "border-transparent bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        executive: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        core: "border-transparent bg-bsg-green/20 text-bsg-green dark:bg-bsg-green/30",
        member: "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
