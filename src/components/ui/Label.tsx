import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      "text-[13px] font-medium leading-none text-[hsl(var(--foreground))] peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const reactId = React.useId();
  const errorId = `${reactId}-error`;
  const hintId = `${reactId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby":
          [describedBy, (children as React.ReactElement<{ "aria-describedby"?: string }>).props["aria-describedby"]]
            .filter(Boolean)
            .join(" ") || undefined,
        id: (children as React.ReactElement<{ id?: string }>).props.id ?? `${reactId}-control`,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={(control as React.ReactElement<{ id?: string }>)?.props?.id}>
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </Label>
      ) : null}
      {control}
      {error ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
