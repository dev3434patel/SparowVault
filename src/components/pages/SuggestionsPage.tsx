import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, parseISO } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { aiSuggestionRepo } from "@/repositories";
import { useUIStore } from "@/store/uiStore";
import {
  appendSuggestionHistory,
  buildSuggestionEngineInput,
  historyTypeForStatus,
  syncSuggestionsForUser,
} from "@/services/suggestionSync";
import { explainSuggestionInSimpleLanguage } from "@/services/suggestionAiExplain";
import {
  buildPersonaCoachSurfaces,
  buildPersonaSignals,
  inferPersona,
  PERSONA_LABELS,
  type CoachMessage,
  type Persona,
} from "@/services/personaEngine";
import type { AiSuggestion, AiSuggestionSeverity, AiSuggestionType } from "@/types";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wrench,
} from "lucide-react";

type SectionKey =
  | "urgent"
  | "save_money"
  | "debt_card"
  | "goals"
  | "bills"
  | "udhari"
  | "tax_report"
  | "history";

const SECTION_LABEL: Record<SectionKey, string> = {
  urgent: "Urgent",
  save_money: "Save money",
  debt_card: "Debt & cards",
  goals: "Goals",
  bills: "Bills & cashflow",
  udhari: "Udhari",
  tax_report: "Tax & review",
  history: "Dismissed & history",
};

function severityOrder(s: AiSuggestionSeverity): number {
  switch (s) {
    case "danger":
      return 0;
    case "warning":
      return 1;
    case "opportunity":
      return 2;
    default:
      return 3;
  }
}

function activeSuggestion(s: AiSuggestion, now: Date): boolean {
  if (s.status !== "active") return false;
  try {
    return parseISO(s.expiresAt) >= now;
  } catch {
    return false;
  }
}

function historySuggestion(s: AiSuggestion): boolean {
  return (
    s.status === "dismissed" ||
    s.status === "viewed" ||
    s.status === "useful" ||
    s.status === "not_useful" ||
    s.status === "action_taken" ||
    s.status === "remind_later" ||
    s.status === "expired"
  );
}

function bucketForActive(s: AiSuggestion): SectionKey {
  if (s.severity === "danger" || s.suggestionType === "emergency_fund") return "urgent";
  if (s.suggestionType === "credit_card") {
    const u = Number((s.calculationInputsJson as { utilizationPct?: unknown })?.utilizationPct);
    if (Number.isFinite(u) && u >= 90) {
      return "urgent";
    }
    return "debt_card";
  }
  if (s.suggestionType === "subscription" || s.suggestionType === "loan") return "save_money";
  if (s.suggestionType === "goal") return "goals";
  if (s.suggestionType === "budget" || s.suggestionType === "cashflow") return "bills";
  if (s.suggestionType === "udhari") return "udhari";
  if (s.suggestionType === "tax" || s.suggestionType === "missing_bill") return "tax_report";
  if (s.severity === "warning") return "urgent";
  return "save_money";
}

function typeBadge(t: AiSuggestionType): string {
  return t.replace(/_/g, " ");
}

export function SuggestionsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const toast = useUIStore((s) => s.toast);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const refreshOne = useDataStore((s) => s.refreshOne);
  const accounts = useDataStore((s) => s.accounts);
  const cards = useDataStore((s) => s.cards);
  const loans = useDataStore((s) => s.loans);
  const emis = useDataStore((s) => s.emis);
  const goals = useDataStore((s) => s.goals);
  const budgets = useDataStore((s) => s.budgets);
  const udhari = useDataStore((s) => s.udhari);
  const recurringRules = useDataStore((s) => s.recurringRules);
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);
  const ledgerEvents = useDataStore((s) => s.ledgerEvents);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const aiSuggestions = useDataStore((s) => s.aiSuggestions);

  const [syncing, setSyncing] = useState(false);
  const [aiBusyId, setAiBusyId] = useState<string | null>(null);
  const [personaMode, setPersonaMode] = useState<Persona | "auto">("auto");
  const didAutoSync = useRef(false);

  const now = useMemo(() => new Date(), [aiSuggestions]);

  const personaSignals = useMemo(
    () =>
      buildPersonaSignals({
        transactions,
        accounts,
        cards,
        loans,
        udharis: udhari,
        now,
      }),
    [accounts, cards, loans, now, transactions, udhari],
  );

  const persona = useMemo(
    () => inferPersona(personaSignals, personaMode),
    [personaMode, personaSignals],
  );

  const coach = useMemo(
    () =>
      buildPersonaCoachSurfaces({
        persona,
        suggestions: aiSuggestions.filter((s) => activeSuggestion(s, now)),
      }),
    [aiSuggestions, now, persona],
  );

  const { activeBySection, history } = useMemo(() => {
    const active = coach.rankedSuggestions;
    const hist = aiSuggestions.filter(historySuggestion);
    const m = new Map<SectionKey, AiSuggestion[]>();
    (Object.keys(SECTION_LABEL) as SectionKey[]).forEach((k) => {
      if (k !== "history") m.set(k, []);
    });
    for (const s of active) {
      const b = bucketForActive(s);
      m.get(b)!.push(s);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
    }
    hist.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return { activeBySection: m, history: hist };
  }, [aiSuggestions, coach.rankedSuggestions]);

  const runSync = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const input = buildSuggestionEngineInput(user.id, {
        accounts,
        cards,
        loans,
        emis,
        goals,
        budgets,
        udhari,
        recurringRules,
        categories,
        transactions,
        ledgerEvents,
        ledgerEffects,
      });
      const r = await syncSuggestionsForUser(user.id, input);
      await refreshOne("aiSuggestions", user);
      toast({
        title: "Suggestions refreshed",
        description: `Created ${r.created}, updated ${r.updated}, expired ${r.expired}.`,
        kind: "success",
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Could not refresh suggestions", kind: "error" });
    } finally {
      setSyncing(false);
    }
  }, [
    user,
    accounts,
    cards,
    loans,
    emis,
    goals,
    budgets,
    udhari,
    recurringRules,
    categories,
    transactions,
    ledgerEvents,
    ledgerEffects,
    refreshOne,
    toast,
  ]);

  useEffect(() => {
    if (!user || didAutoSync.current) return;
    didAutoSync.current = true;
    void runSync();
  }, [user, runSync]);

  async function patchStatus(s: AiSuggestion, status: AiSuggestion["status"], remindAt?: string | null) {
    if (!user) return;
    const u = await aiSuggestionRepo.update(s.id, {
      status,
      remindAt: remindAt ?? null,
      historyJson: appendSuggestionHistory(s, historyTypeForStatus(status)),
    } as Partial<AiSuggestion>);
    if (u) upsertLocal("aiSuggestions", u);
  }

  async function markViewed(s: AiSuggestion) {
    if (!user) return;
    const u = await aiSuggestionRepo.update(s.id, {
      historyJson: appendSuggestionHistory(s, "viewed"),
    } as Partial<AiSuggestion>);
    if (u) upsertLocal("aiSuggestions", u);
  }

  async function runAi(s: AiSuggestion) {
    setAiBusyId(s.id);
    try {
      const text = await explainSuggestionInSimpleLanguage({
        title: s.title,
        reason: s.reason,
        calculationInputsJson:
          s.calculationInputsJson && typeof s.calculationInputsJson === "object"
            ? (s.calculationInputsJson as Record<string, unknown>)
            : {},
      });
      if (!text) {
        toast({
          title: "Plain-language AI not configured",
          description: "Set VITE_SUGGESTION_EXPLAIN_URL to a trusted rewrite endpoint.",
          kind: "info",
        });
        return;
      }
      const u = await aiSuggestionRepo.update(s.id, { aiExplanation: text } as Partial<AiSuggestion>);
      if (u) upsertLocal("aiSuggestions", u);
    } finally {
      setAiBusyId(null);
    }
  }

  const orderedSections: SectionKey[] = [
    "urgent",
    "save_money",
    "debt_card",
    "goals",
    "bills",
    "udhari",
    "tax_report",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suggestion center"
        description="Rules and ledger math produce each tip; optional AI only rewrites wording. Numbers always come from the calculation block."
        actions={
          <Button variant="outline" onClick={() => void runSync()} disabled={syncing || !user}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Educational guidance</CardTitle>
          <CardDescription>
            SparowVault does not provide investment buy/sell advice. Suggestions are estimates from your data;
            verify with your bank, lender, or tax professional before acting.
          </CardDescription>
        </CardHeader>
      </Card>

      <PersonaCoachPanel
        personaMode={personaMode}
        onPersonaModeChange={setPersonaMode}
        coach={coach}
      />

      {orderedSections.map((key) => {
        const items = activeBySection.get(key) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={key} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {SECTION_LABEL[key]}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((s) => (
                <SuggestionCard
                  key={s.id}
                  s={s}
                  aiBusy={aiBusyId === s.id}
                  onDismiss={() => void patchStatus(s, "dismissed")}
                  onUseful={() => void patchStatus(s, "useful")}
                  onNotUseful={() => void patchStatus(s, "not_useful")}
                  onLater={() =>
                    void patchStatus(s, "remind_later", addDays(new Date(), 3).toISOString())
                  }
                  onAction={() => void patchStatus(s, "action_taken")}
                  onViewCalculation={() => void markViewed(s)}
                  onAi={() => void runAi(s)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {SECTION_LABEL.history}
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dismissed or completed suggestions yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((s) => (
              <SuggestionCard key={s.id} s={s} history readOnly />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PersonaCoachPanel({
  personaMode,
  onPersonaModeChange,
  coach,
}: {
  personaMode: Persona | "auto";
  onPersonaModeChange: (value: Persona | "auto") => void;
  coach: ReturnType<typeof buildPersonaCoachSurfaces>;
}) {
  const planCards = [
    coach.cashflowDangerWarning,
    coach.debtActionPlan,
    coach.goalActionPlan,
    coach.weeklyMoneyReview,
    coach.monthlyClosingSummary,
  ].filter(Boolean) as CoachMessage[];

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Persona-aware money coach
              <Badge variant="outline">{PERSONA_LABELS[coach.persona.primary]}</Badge>
              {coach.persona.secondary ? (
                <Badge variant="secondary">Also watch: {PERSONA_LABELS[coach.persona.secondary]}</Badge>
              ) : null}
            </CardTitle>
            <CardDescription>
              {coach.persona.reason} Confidence {Math.round(coach.persona.confidence * 100)}%. Every card below is backed by deterministic source data.
            </CardDescription>
          </div>
          <div className="w-full md:w-56">
            <Select value={personaMode} onValueChange={(value) => onPersonaModeChange(value as Persona | "auto")}>
              <SelectTrigger aria-label="Coach mode">
                <SelectValue placeholder="Coach mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto detect</SelectItem>
                {(Object.keys(PERSONA_LABELS) as Persona[]).map((persona) => (
                  <SelectItem key={persona} value={persona}>
                    {PERSONA_LABELS[persona]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top 3 actions today
          </h2>
          {coach.top3ActionsToday.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
              No active deterministic suggestions yet. Refresh suggestions after adding accounts, transactions, cards, loans, or goals.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {coach.top3ActionsToday.map((item) => (
                <CoachMiniCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {planCards.map((item) => (
            <CoachMiniCard key={item.id} item={item} compact />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CoachMiniCard({ item, compact = false }: { item: CoachMessage; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
        <Badge
          variant={item.riskLevel === "critical" || item.riskLevel === "high" ? "danger" : "secondary"}
          className="text-[10px] capitalize"
        >
          {item.riskLevel}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{item.message}</p>
      {!compact ? (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Action: </span>
          {item.recommendedAction}
        </p>
      ) : null}
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium">Source data and calculation</summary>
        <p className="mt-2">{item.calculation}</p>
        <pre className="mt-2 max-h-28 overflow-auto rounded bg-muted/30 p-2 text-[10px]">
          {JSON.stringify(item.sourceData, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function SuggestionCard({
  s,
  history = false,
  readOnly = false,
  aiBusy = false,
  onDismiss,
  onUseful,
  onNotUseful,
  onLater,
  onAction,
  onViewCalculation,
  onAi,
}: {
  s: AiSuggestion;
  history?: boolean;
  readOnly?: boolean;
  aiBusy?: boolean;
  onDismiss?: () => void;
  onUseful?: () => void;
  onNotUseful?: () => void;
  onLater?: () => void;
  onAction?: () => void;
  onViewCalculation?: () => void;
  onAi?: () => void;
}) {
  const calc =
    s.calculationInputsJson && typeof s.calculationInputsJson === "object"
      ? (s.calculationInputsJson as Record<string, unknown>)
      : {};

  return (
    <Card className={history ? "opacity-90" : ""}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base leading-snug">{s.title}</CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase">
            {typeBadge(s.suggestionType)}
          </Badge>
          <Badge
            variant={s.severity === "danger" ? "danger" : "secondary"}
            className="text-[10px] capitalize"
          >
            {s.severity}
          </Badge>
          {s.status !== "active" && (
            <Badge variant="outline" className="text-[10px]">
              {s.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm text-foreground/90">{s.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {s.aiExplanation ? (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-muted-foreground">
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Simpler wording
            </div>
            <p className="whitespace-pre-wrap">{s.aiExplanation}</p>
          </div>
        ) : null}

        <details
          className="rounded-md border border-border bg-muted/20 p-2"
          onToggle={(event) => {
            if ((event.currentTarget as HTMLDetailsElement).open) onViewCalculation?.();
          }}
        >
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Calculation inputs (source of truth)
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto text-[11px] leading-relaxed text-muted-foreground">
            {JSON.stringify(calc, null, 2)}
          </pre>
        </details>

        {s.recommendedAction ? (
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">Recommended: </span>
            {s.recommendedAction}
          </div>
        ) : null}

        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onUseful}>
              <ThumbsUp className="mr-1 h-3.5 w-3.5" /> Useful
            </Button>
            <Button size="sm" variant="outline" onClick={onDismiss}>
              Dismiss
            </Button>
            <Button size="sm" variant="outline" onClick={onNotUseful}>
              <ThumbsDown className="mr-1 h-3.5 w-3.5" /> Not useful
            </Button>
            <Button size="sm" variant="outline" onClick={onLater}>
              <Clock3 className="mr-1 h-3.5 w-3.5" /> Remind later
            </Button>
            <Button size="sm" variant="outline" onClick={onAction}>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Action taken
            </Button>
            <Button size="sm" variant="ghost" onClick={onAi} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wrench className="mr-1 h-3.5 w-3.5" />}
              Simplify wording
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
