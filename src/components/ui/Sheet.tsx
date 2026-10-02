import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/55 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

type Side = "left" | "right" | "top" | "bottom";

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: Side;
  size?: "sm" | "md" | "lg" | "xl";
}

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = "right", size = "md", onOpenAutoFocus, ...props }, ref) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const closeOnEscape = React.useCallback(() => {
    localRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Close"]')?.click();
  }, []);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  // Radix portals content when open; trap reinforces Tab cycle + restore-focus.
  // Escape must close even when another dismissable layer is stacked above this sheet.
  useFocusTrap(true, localRef, { onEscape: closeOnEscape });

  const sideCls: Record<Side, string> = {
    right:
      "inset-y-0 right-0 h-full border-l data-[state=open]:animate-[slideInRight_.3s_ease-out] data-[state=closed]:animate-[slideOutRight_.25s_ease-in]",
    left:
      "inset-y-0 left-0 h-full border-r data-[state=open]:animate-[slideInLeft_.3s_ease-out] data-[state=closed]:animate-[slideOutLeft_.25s_ease-in]",
    top: "inset-x-0 top-0 w-full border-b",
    bottom: "inset-x-0 bottom-0 w-full border-t",
  };
  const sizeCls =
    side === "top" || side === "bottom"
      ? {
          sm: "max-h-[30vh]",
          md: "max-h-[50vh]",
          lg: "max-h-[70vh]",
          xl: "max-h-[90vh]",
        }[size]
      : {
          sm: "w-full max-w-xs",
          md: "w-full max-w-md",
          lg: "w-full max-w-lg",
          xl: "w-full max-w-xl",
        }[size];

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={setRefs}
        tabIndex={-1}
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "fixed z-50 flex flex-col gap-3 bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] p-5 shadow-[var(--shadow-elevated)] border-border",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
          sideCls[side],
          sizeCls,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);
export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);

export const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

export const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";
