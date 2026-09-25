import { z } from "zod";

/** Light shared schema for report query params — fail-fast before PHP call. */
export const reportQuerySchema = z.object({
  report: z.string().min(1),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  partyId: z.string().min(1).optional(),
  ledgerId: z.string().min(1).optional(),
  side: z.enum(["receivable", "payable"]).optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export function parseReportQuery(input: unknown): { ok: true; data: ReportQuery } | { ok: false; message: string } {
  const parsed = reportQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid report params" };
  }
  return { ok: true, data: parsed.data };
}
