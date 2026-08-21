
import { useEffect, useRef, useState, type ReactNode } from "react";

export function SafeChart({
  className,
  children,
}: {
  className: string;
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.max(0, Math.floor(rect.width));
        const height = Math.max(0, Math.floor(rect.height));
        setSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      });
    });
    obs.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  );
}
