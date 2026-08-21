import { useUIStore } from "@/store/uiStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

export function ConfirmHost() {
  const confirmReq = useUIStore((s) => s.confirm);
  const resolveConfirm = useUIStore((s) => s.resolveConfirm);
  const open = !!confirmReq;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && confirmReq) resolveConfirm(false);
      }}
    >
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            {confirmReq?.destructive ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-expense-soft text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <DialogTitle>{confirmReq?.title ?? "Confirm"}</DialogTitle>
              {confirmReq?.description ? (
                <DialogDescription className="mt-1">
                  {confirmReq.description}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => resolveConfirm(false)}>
            {confirmReq?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={confirmReq?.destructive ? "destructive" : "default"}
            onClick={() => resolveConfirm(true)}
            autoFocus
          >
            {confirmReq?.confirmLabel ?? (confirmReq?.destructive ? "Delete" : "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
