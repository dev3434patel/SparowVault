import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background,color,border,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-sm",
        secondary:
          "bg-surface-2 text-[hsl(var(--foreground))] border border-border hover:bg-surface-3",
        outline:
          "border border-border bg-transparent hover:bg-surface-2 text-[hsl(var(--foreground))]",
        ghost:
          "bg-transparent hover:bg-surface-2 text-[hsl(var(--foreground))]",
        destructive:
          "bg-[hsl(var(--danger))] text-white hover:brightness-110 shadow-sm",
        success:
          "bg-[hsl(var(--success))] text-white hover:brightness-110 shadow-sm",
        subtle:
          "bg-[hsl(var(--surface))] text-[hsl(var(--foreground))] border border-border hover:bg-surface-2",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3",
        default: "h-9 px-4",
        lg: "h-10 px-5",
        xl: "h-12 px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
