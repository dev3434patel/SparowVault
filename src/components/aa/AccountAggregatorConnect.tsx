import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { importSourceRepo, transactionRepo } from "@/repositories";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import {
  AA_LOCAL_PROVIDER_LABEL,
  approveLocalAaConsent,
  browserAaGate,
  confirmAaReview,
  discoverAccounts,
  fetchAaStatus,
  fetchAaTransactions,
  linkAccounts,
  readAaConsentStatus,
  requestAaConsent,
  serverAaHttp,
  verifyAccountLink,
  type AaDiscoveredAccount,
  type AaPurpose,
  type AaReviewList,
} from "@/services/aa";
import { AaClosedError } from "@/services/aa/errors";
import { formatMoney } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function failureMessage(error: unknown, fallback: string): string {
  if (error instanceof AaClosedError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AccountAggregatorConnect() {
  const copy = useMessages().copy.aa;
  const user = useAuthStore((s) => s.currentUser);
  const accounts = useDataStore((s) => s.accounts);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const toast = useUIStore((s) => s.toast);
  const today = isoDay(new Date());
  const monthAgo = isoDay(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [statusMessage, setStatusMessage] = useState(copy.checking);
  const [configured, setConfigured] = useState(false);
  const [localProvider, setLocalProvider] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [discovered, setDiscovered] = useState<AaDiscoveredAccount[]>([]);
  const [selectedRef, setSelectedRef] = useState("");
  const [linkRef, setLinkRef] = useState("");
  const [otpRef, setOtpRef] = useState("");
  const [otp, setOtp] = useState("");
  const [consentHandle, setConsentHandle] = useState("");
  const [consentId, setConsentId] = useState("");
  const [review, setReview] = useState<AaReviewList | null>(null);
  const [sourceId, setSourceId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [decisions, setDecisions] = useState<Record<string, { include: boolean; purpose: AaPurpose }>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!user) {
      setConfigured(false);
      setLocalProvider(false);
      setStatusMessage(copy.signIn);
      return;
    }
    let active = true;
    void fetchAaStatus().then((status) => {
      if (!active) return;
      setConfigured(status.configured);
      setLocalProvider(status.localProvider);
      setStatusMessage(status.message);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const selected = discovered.find((account) => account.accRefNumber === selectedRef) ?? null;
  const personalAccounts = accounts.filter((account) => !account.isDeleted && !account.isInactive);

  async function run(action: () => Promise<void>) {
    if (!user || !configured || busy) return;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      const message = failureMessage(error, copy.failed);
      setNotice(message);
      toast({ title: message, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>
          {copy.body}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p data-testid="aa-status">{statusMessage}</p>
        {localProvider ? <p data-testid="aa-local-provider">{AA_LOCAL_PROVIDER_LABEL}</p> : null}
        {configured && user ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label={copy.customerId}>
                <Input value={customerId} onChange={(event) => setCustomerId(event.target.value)} autoComplete="off" placeholder={copy.customerPh} />
              </Field>
              <Field label={copy.from}>
                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </Field>
              <Field label={copy.to}>
                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void run(async () => {
                  const found = await discoverAccounts(browserAaGate({ configured: true, message: "" }), serverAaHttp(), { customerId });
                  setDiscovered(found);
                  setSelectedRef(found[0]?.accRefNumber ?? "");
                  setLinkRef("");
                  setConsentHandle("");
                  setConsentId("");
                  setReview(null);
                  setNotice(found.length === 0
                    ? copy.noneFound
                    : copy.discovered.replace("{n}", String(found.length)));
                })}
              >
                {copy.discover}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !selected}
                onClick={() => void run(async () => {
                  if (!selected) return;
                  const linked = await linkAccounts(browserAaGate({ configured: true, message: "" }), serverAaHttp(), { customerId, account: selected });
                  if (!linked.linked) {
                    setOtpRef(linked.refNumber);
                    setLinkRef("");
                    setNotice(copy.linkCodeAsked);
                    return;
                  }
                  setLinkRef(linked.linkRefNumber);
                  setOtpRef("");
                  setNotice(copy.linked.replace("{mask}", selected.maskedAccNumber));
                })}
              >
                {copy.link}
              </Button>
            </div>
            {discovered.length > 0 ? (
              <label className="block space-y-1">
                <span className="text-muted-foreground">Masked account from the provider</span>
                <select className="h-9 w-full rounded-md border border-border bg-card px-3" value={selectedRef} onChange={(event) => setSelectedRef(event.target.value)}>
                  {discovered.map((account) => (
                    <option key={account.accRefNumber} value={account.accRefNumber}>
                      {account.maskedAccNumber} · {account.fipId}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {otpRef ? (
              <div className="flex flex-wrap items-end gap-2">
                <Field label={copy.linkCode}>
                  <Input value={otp} onChange={(event) => setOtp(event.target.value)} autoComplete="one-time-code" />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(async () => {
                    const verified = await verifyAccountLink(browserAaGate({ configured: true, message: "" }), serverAaHttp(), { refNumber: otpRef, token: otp });
                    setLinkRef(verified.linkRefNumber);
                    setOtpRef("");
                    setOtp("");
                    setNotice(copy.linkConfirmed);
                  })}
                >
                  {copy.verify}
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy || !selected || !linkRef}
                onClick={() => void run(async () => {
                  if (!selected) return;
                  const consent = await requestAaConsent(browserAaGate({ configured: true, message: "" }), serverAaHttp(), {
                    customerId,
                    account: selected,
                    linkRefNumber: linkRef,
                    from,
                    to,
                  });
                  setConsentHandle(consent.consentHandle);
                  setConsentId("");
                  setReview(null);
                  setNotice(localProvider
                    ? "Consent was requested on the local development provider. Set the status to approved before fetch. Nothing was imported yet."
                    : copy.consentRequested);
                })}
              >
                {copy.requestConsent}
              </Button>
              {localProvider ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !consentHandle}
                  onClick={() => void run(async () => {
                    await approveLocalAaConsent(browserAaGate({ configured: true, message: "" }), serverAaHttp(), consentHandle);
                    setConsentId("");
                    setReview(null);
                    setNotice("Local development provider consent was set to approved. Check consent status next. Nothing was imported yet.");
                  })}
                >
                  Approve local consent
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={busy || !consentHandle}
                onClick={() => void run(async () => {
                  const status = await readAaConsentStatus(browserAaGate({ configured: true, message: "" }), serverAaHttp(), consentHandle);
                  setConsentId(status.consentId);
                  setNotice(copy.consentActive);
                })}
              >
                {copy.checkConsent}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !consentId}
                onClick={() => void run(async () => {
                  if (!user) return;
                  const [existingTransactions, existingSources] = await Promise.all([
                    transactionRepo.list(user.id),
                    importSourceRepo.list(user.id),
                  ]);
                  const fetched = await fetchAaTransactions(browserAaGate({ configured: true, message: "" }), serverAaHttp(), {
                    userId: user.id,
                    consentId,
                    from,
                    to,
                    maskedAccount: selected?.maskedAccNumber ?? "",
                    existingTransactions,
                    existingSources,
                    saveSource: (row) => importSourceRepo.create(row),
                  });
                  setReview(fetched.review);
                  setSourceId(fetched.sourceId);
                  setDecisions(Object.fromEntries(fetched.review.rows.map((row) => [row.id, { include: row.include, purpose: "" as AaPurpose }])));
                  setNotice(fetched.staged
                    ? copy.waitingReview
                    : copy.alreadyFetched);
                })}
              >
                {copy.fetch}
              </Button>
            </div>
            {review ? (
              <div className="space-y-3">
                <p>
                  {copy.review} {review.maskedAccount || "—"} · {copy.session} {review.fiSessionId}.{" "}
                  {review.providerBalancePaise === null
                    ? copy.noBalance
                    : copy.providerReported.replace("{amount}", formatMoney(review.providerBalancePaise))}
                </p>
                <label className="block space-y-1">
                  <span className="text-muted-foreground">{copy.personalAccount}</span>
                  <select className="h-9 w-full rounded-md border border-border bg-card px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                    <option value="">{copy.chooseAccount}</option>
                    {personalAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-muted-foreground">{copy.otherAccount}</span>
                  <select className="h-9 w-full rounded-md border border-border bg-card px-3" value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>
                    <option value="">{copy.notTransfer}</option>
                    {personalAccounts.filter((account) => account.id !== accountId).map((account) => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                </label>
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 pr-2">{copy.post}</th>
                        <th className="py-2 pr-2">{copy.date}</th>
                        <th className="py-2 pr-2">{copy.narration}</th>
                        <th className="py-2 pr-2">{copy.amount}</th>
                        <th className="py-2">{copy.purpose}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {review.rows.map((row) => {
                        const decision = decisions[row.id] ?? { include: false, purpose: "" as AaPurpose };
                        const purposes: AaPurpose[] = row.direction === "debit" ? ["expense", "transfer"] : ["income", "refund", "transfer"];
                        return (
                          <tr key={row.id} className="border-b border-border">
                            <td className="py-2 pr-2">
                              <input
                                type="checkbox"
                                checked={decision.include}
                                disabled={row.alreadyPosted}
                                onChange={(event) => setDecisions((current) => ({
                                  ...current,
                                  [row.id]: { ...decision, include: event.target.checked },
                                }))}
                              />
                            </td>
                            <td className="py-2 pr-2">{row.date}</td>
                            <td className="py-2 pr-2">
                              {row.narration}
                              {row.alreadyPosted ? <Badge variant="outline">{copy.alreadyPosted}</Badge> : null}
                              {row.duplicateOfTransactionId ? <Badge variant="warning">{copy.possibleDuplicate}</Badge> : null}
                              {row.direction === "credit" ? <Badge variant="outline">{copy.creditNotIncome}</Badge> : null}
                            </td>
                            <td className="py-2 pr-2">{row.direction === "debit" ? copy.debit : copy.credit} {formatMoney(row.amountPaise)}</td>
                            <td className="py-2">
                              <select
                                className="h-9 rounded-md border border-border bg-card px-2"
                                value={decision.purpose}
                                onChange={(event) => setDecisions((current) => ({
                                  ...current,
                                  [row.id]: { ...decision, purpose: event.target.value as AaPurpose },
                                }))}
                              >
                                <option value="">{copy.choosePurpose}</option>
                                {purposes.map((purpose) => (
                                  <option key={purpose} value={purpose}>{purpose}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(async () => {
                    if (!user || !review) return;
                    const existingTransactions = await transactionRepo.list(user.id);
                    const result = await confirmAaReview({
                      userId: user.id,
                      accountId,
                      toAccountId: toAccountId || undefined,
                      review,
                      sourceId,
                      decisions,
                      existingTransactions,
                      createTransaction: async (row) => {
                        const saved = await transactionRepo.create(row);
                        upsertLocal("transactions", saved);
                        return saved;
                      },
                      updateSource: (id, patch) => importSourceRepo.update(id, patch),
                    });
                    setReview({
                      ...review,
                      rows: review.rows.map((row) => ({
                        ...row,
                        alreadyPosted: row.alreadyPosted || result.postedIds.length > 0 && (decisions[row.id]?.include ?? false),
                      })),
                    });
                    setNotice(result.postedIds.length > 0
                      ? copy.posted.replace("{n}", String(result.postedIds.length))
                      : copy.nothingPosted);
                    toast({
                      title: result.postedIds.length > 0 ? copy.posted.replace("{n}", String(result.postedIds.length)) : copy.nothingPosted,
                      kind: result.postedIds.length > 0 ? "success" : "warning",
                    });
                  })}
                >
                  {copy.confirm}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        {notice ? <p>{notice}</p> : null}
      </CardContent>
    </Card>
  );
}
