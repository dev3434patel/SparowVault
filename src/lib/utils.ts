import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  // RFC4122-ish random id, collision-resistant for local data
  const rand = () => Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand()}${rand()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function range(start: number, end: number, step = 1): number[] {
  const out: number[] = [];
  if (step === 0) return out;
  if (step > 0) for (let i = start; i < end; i += step) out.push(i);
  else for (let i = start; i > end; i += step) out.push(i);
  return out;
}

export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (x: T) => K,
): Record<K, T[]> {
  const map = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = keyFn(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

export function sumBy<T>(arr: T[], valFn: (x: T) => number): number {
  let sum = 0;
  for (const item of arr) sum += valFn(item) || 0;
  return sum;
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  return (numerator / denominator) * 100;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}
