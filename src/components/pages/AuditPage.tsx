import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
} from "@/components/ui/Table";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import { Download, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/format";
import { exportModuleToSheet } from "@/exports/xlsxExporter";

const ACTION_TONES: Record<string, "info" | "warning" | "danger" | "success" | "outline"> = {
  create: "success",
  update: "info",
  soft_delete: "warning",
  hard_delete: "danger",
  restore: "success",
  login: "info",
  logout: "outline",
  lock: "warning",
  unlock: "success",
  export: "info",
  import: "info",
  backup: "success",
  restore_backup: "success",
  settings_change: "info",
};

export function AuditPage() {
  const logs = useDataStore((s) => s.auditLogs);
  const toast = useUIStore((s) => s.toast);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [entity, setEntity] = useState<string>("all");

  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (entity !== "all" && l.entity !== entity) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !l.detail.toLowerCase().includes(s) &&
          !l.entity.toLowerCase().includes(s) &&
          !(l.entityId ?? "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [logs, action, entity, search]);

  function exportLogs() {
    exportModuleToSheet(
      "Audit_Log",
      filtered.map((l) => ({
        Timestamp: l.createdAt,
        Action: l.action,
        Entity: l.entity,
        EntityId: l.entityId ?? "",
        Detail: l.detail,
      })),
    );
    toast({ title: "Audit log exported", kind: "success" });
  }

  return (
    <div>
      <PageHeader
        title="Audit & Backup"
        description="Full activity history for this profile. Every create, update, delete is recorded."
        actions={
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4" /> Export log
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total events</CardDescription>
            <CardTitle>{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Creates</CardDescription>
            <CardTitle className="text-income">
              {logs.filter((l) => l.action === "create").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Updates</CardDescription>
            <CardTitle className="text-info">
              {logs.filter((l) => l.action === "update").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Deletes</CardDescription>
            <CardTitle className="text-expense">
              {
                logs.filter(
                  (l) => l.action === "soft_delete" || l.action === "hard_delete",
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Input
              placeholder="Search details, entity, ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.keys(ACTION_TONES).map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title="No audit events"
              description="As you add, edit, and manage data, events will appear here."
            />
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs tabular-nums">
                        {formatDate(l.createdAt, "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ACTION_TONES[l.action] ?? "outline"}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {l.entity}
                      </TableCell>
                      <TableCell className="text-xs">{l.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
