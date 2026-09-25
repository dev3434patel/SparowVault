import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useI18n } from "@/company/i18n/react";

export function PinConfirmDialog({
  open,
  title,
  confirmLabel,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (pin: string, comment: string) => void;
  busy?: boolean;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [comment, setComment] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descId = useId();

  useFocusTrap(open, panelRef, { onEscape: onCancel, initialFocusRef: pinRef });

  useEffect(() => {
    if (open) {
      setPin("");
      setComment("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
      >
        <h3 id={titleId} className="text-sm font-semibold">
          {title}
        </h3>
        <p id={descId} className="mt-1 text-xs text-muted-foreground">
          {t("pin.helper")}
        </p>
        <div className="mt-3 space-y-2">
          <Field label={t("common.pin")}>
            <Input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={t("pin.placeholder")}
            />
          </Field>
          <Field label={t("pin.comment")}>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("pin.reasonPlaceholder")} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !pin.trim()}
            onClick={() => onConfirm(pin.trim(), comment.trim())}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
