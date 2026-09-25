import { useCallback, useEffect, useState } from "react";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";

export type MemberRow = Record<string, unknown>;

export function useMembers() {
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const storeMemberships = useCompanyStore((s) => s.memberships);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      setMembers(await companyApi.listMembers(companyId));
    } catch {
      setMembers(
        storeMemberships
          .filter((m) => m.companyId === companyId)
          .map((m) => ({
            id: m.id,
            user_id: m.userId,
            display_name: m.displayName ?? m.companyDisplayName,
            status: m.status,
          })),
      );
    } finally {
      setLoading(false);
    }
  }, [companyId, storeMemberships]);

  useEffect(() => {
    void load();
  }, [load]);

  return { companyId, members, err, setErr, loading, load };
}
