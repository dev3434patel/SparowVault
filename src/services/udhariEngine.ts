/**
 * Phase 9 — Udhari intelligence: per-person rollups, ageing, risk, reminders.
 * Works on existing UdhariRecord + UdhariSettlement collections (no SQL required client-side).
 */

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { UdhariRecord, UdhariSettlement } from "@/types";
import { formatMoney, udhariAmountPaise, udhariSettledPaise } from "@/utils/money";

export type UdhariRiskLevel = "normal" | "watch" | "risky" | "doubtful";
export type UdhariReminderTone = "polite" | "firm" | "business" | "hinglish";

export function udhariPersonKey(personName: string, phone?: string): string {
  const n = personName.trim().toLowerCase().replace(/\s+/g, " ");
  const p = (phone ?? "").replace(/\D/g, "");
  return `${n}::${p}`;
}

/** DJB2-ish opaque fingerprint for shadow tables / privacy (not cryptographic). */
export function opaquePhoneHash(phone: string | undefined): string {
  if (!phone?.trim()) return "";
  const d = phone.replace(/\D/g, "");
  let h = 5381;
  for (let i = 0; i < d.length; i++) {
    h = ((h << 5) + h) ^ d.charCodeAt(i);
  }
  return `h_${(h >>> 0).toString(16)}`;
}

export function udhariRemainingPaise(r: UdhariRecord): number {
  return Math.max(0, udhariAmountPaise(r) - udhariSettledPaise(r));
}

export interface UdhariAgeingBucket {
  label: string;
  amountPaise: number;
}

export interface UdhariPersonIntel {
  key: string;
  displayName: string;
  phone?: string;
  phoneHash: string;
  relationship: string;
  totalReceivablePaise: number;
  totalPayablePaise: number;
  netPaise: number;
  riskLevel: UdhariRiskLevel;
  openEntries: UdhariRecord[];
  overdueCount: number;
  overdueAmountPaise: number;
  maxOverdueDays: number;
  ageingBuckets: UdhariAgeingBucket[];
  borrowTxnCount30d: number;
}

function bucketForEntry(r: UdhariRecord, today: Date): UdhariAgeingBucket["label"] | null {
  if (r.status === "settled" || r.status === "written_off") return null;
  const rem = udhariRemainingPaise(r);
  if (rem <= 0) return null;
  if (!r.dueDate) return "normal_0_7";
  const due = startOfDay(parseISO(r.dueDate));
  const d0 = startOfDay(today);
  const days = differenceInCalendarDays(d0, due);
  if (days <= 7) return "normal_0_7";
  if (days <= 30) return "watch_8_30";
  if (days <= 90) return "risky_31_90";
  return "doubtful_90_plus";
}

function riskFromIntel(
  overdueAmt: number,
  recvOpen: number,
  borrowCount: number,
): UdhariRiskLevel {
  if (overdueAmt >= 500_000 || recvOpen >= 2_000_000) return "doubtful";
  if (overdueAmt >= 100_000 || recvOpen >= 500_000) return "risky";
  if (overdueAmt > 0 || borrowCount >= 4) return "watch";
  return "normal";
}

export function buildUdhariPeopleIntel(
  records: UdhariRecord[],
  settlements: UdhariSettlement[],
  today = new Date(),
): UdhariPersonIntel[] {
  const map = new Map<string, UdhariPersonIntel>();
  const since = new Date(today);
  since.setDate(since.getDate() - 30);

  for (const r of records) {
    if (r.isDeleted === 1) continue;
    const key = udhariPersonKey(r.personName, r.phone);
    const phoneHash = opaquePhoneHash(r.phone);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        displayName: r.personName.trim(),
        phone: r.phone?.trim() || undefined,
        phoneHash,
        relationship: r.context,
        totalReceivablePaise: 0,
        totalPayablePaise: 0,
        netPaise: 0,
        riskLevel: "normal",
        openEntries: [],
        overdueCount: 0,
        overdueAmountPaise: 0,
        maxOverdueDays: 0,
        ageingBuckets: [],
        borrowTxnCount30d: 0,
      };
      map.set(key, row);
    }
    const rem = udhariRemainingPaise(r);
    if (r.type === "receivable") row.totalReceivablePaise += rem;
    else row.totalPayablePaise += rem;
    if (r.status !== "settled" && r.status !== "written_off") {
      row.openEntries.push(r);
      if (r.dueDate && rem > 0) {
        const due = parseISO(r.dueDate);
        const daysLate = differenceInCalendarDays(startOfDay(today), startOfDay(due));
        if (daysLate > 0) {
          row.overdueCount += 1;
          row.overdueAmountPaise += rem;
          row.maxOverdueDays = Math.max(row.maxOverdueDays, daysLate);
        }
      }
    }
    if (r.type === "payable" && parseISO(r.givenDate) >= since) {
      row.borrowTxnCount30d += 1;
    }
  }

  const bucketsTemplate: UdhariAgeingBucket["label"][] = [
    "normal_0_7",
    "watch_8_30",
    "risky_31_90",
    "doubtful_90_plus",
  ];

  for (const row of map.values()) {
    row.netPaise = row.totalReceivablePaise - row.totalPayablePaise;
    const bucketMap = new Map<UdhariAgeingBucket["label"], number>();
    for (const lab of bucketsTemplate) bucketMap.set(lab, 0);
    for (const r of row.openEntries) {
      const b = bucketForEntry(r, today);
      if (b) bucketMap.set(b, (bucketMap.get(b) ?? 0) + udhariRemainingPaise(r));
    }
    row.ageingBuckets = bucketsTemplate.map((label) => ({
      label,
      amountPaise: bucketMap.get(label) ?? 0,
    }));
    row.riskLevel = riskFromIntel(
      row.overdueAmountPaise,
      row.totalReceivablePaise,
      row.borrowTxnCount30d,
    );
  }

  void settlements;
  return Array.from(map.values()).sort((a, b) =>
    Math.abs(b.netPaise) === Math.abs(a.netPaise)
      ? a.displayName.localeCompare(b.displayName)
      : Math.abs(b.netPaise) - Math.abs(a.netPaise),
  );
}

export function buildUdhariWhatsAppReminder(
  record: UdhariRecord,
  outstandingPaise: number,
  tone: UdhariReminderTone = "polite",
): string {
  const name = record.personName.trim() || "there";
  const amt = formatMoney(outstandingPaise);
  const due = record.dueDate
    ? ` It was due on ${record.dueDate.slice(0, 10)}.`
    : "";
  if (tone === "firm" && record.type === "receivable") {
    return `Hi ${name}, reminder for the pending udhari amount ${amt}.${due} Please clear it by the earliest possible date.`;
  }
  if (tone === "business" && record.type === "receivable") {
    return `Hello ${name}, this is a payment reminder for outstanding udhari of ${amt}.${due} Kindly confirm the expected settlement date.`;
  }
  if (tone === "hinglish" && record.type === "receivable") {
    return `Hi ${name}, ${amt} udhari pending hai.${due} Please convenient ho tab clear kar dena. Thanks.`;
  }
  const tail =
    record.type === "receivable"
      ? "Could you help close this when convenient? Thanks!"
      : "I'll clear this soon — thanks for your patience.";
  return `Hi ${name}, quick note on our udhari of ${amt}.${due} ${tail}`;
}

export function validateWriteOffReason(reason: string): string | null {
  const clean = reason.trim();
  if (clean.length < 3) return "Write-off reason is required.";
  if (clean.length > 200) return "Write-off reason must be 200 characters or less.";
  return null;
}

export function udhariSettlementTxnLabel(type: "udhari_collect" | "udhari_repay"): string {
  return type === "udhari_collect" ? "Udhari collected (cash in)" : "Udhari repaid (cash out)";
}
