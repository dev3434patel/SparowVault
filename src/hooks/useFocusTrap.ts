import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true" && el.tabIndex !== -1,
  );
}

/**
 * Trap Tab focus inside `containerRef` while `active`.
 * On activate: moves focus into the container (first focusable or container itself).
 * On deactivate: restores focus to the previously focused element.
 * Escape invokes `onEscape` when provided.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  options?: { onEscape?: () => void; initialFocusRef?: RefObject<HTMLElement | null> },
) {
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const onEscape = options?.onEscape;
  const initialFocusRef = options?.initialFocusRef;

  useEffect(() => {
    if (!active) return;
    const node = containerRef.current;
    if (!node) return;

    prevFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      if (preferred && node.contains(preferred)) {
        preferred.focus();
        return;
      }
      const items = listFocusable(node);
      (items[0] ?? node).focus();
    };

    // Defer so Radix / portal content is painted.
    const t = window.setTimeout(focusInitial, 0);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const items = listFocusable(node!);
      if (items.length === 0) {
        e.preventDefault();
        node!.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (current === first || !node!.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !node!.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown, true);
      const restore = prevFocusRef.current;
      if (restore && document.contains(restore)) {
        restore.focus();
      }
    };
  }, [active, containerRef, onEscape, initialFocusRef]);
}
