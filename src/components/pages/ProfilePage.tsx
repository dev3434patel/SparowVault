import { useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/constants";
import {
  changePin,
  resetPinWithSecurityAnswer,
  setSecurityAnswer as saveSecurityAnswerService,
  updateUserProfile,
} from "@/services/authService";
import { Lock, LogOut, Save, UserCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { useMessages } from "@/i18n/useMessages";
import type { PersonalChrome } from "@/i18n/messages/personalChrome";

function validatePin(pin: string, auth: PersonalChrome["auth"]) {
  if (!/^\d{4,8}$/.test(pin)) return auth.pinDigits;
  if (["0000", "1111", "1234", "123456", "9999"].includes(pin)) return auth.pinCommon;
  if (/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(pin) || /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}$/.test(pin)) {
    return auth.pinDate;
  }
  return null;
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.currentUser);
  const refresh = useAuthStore((s) => s.refreshProfiles);
  const lock = useAuthStore((s) => s.lock);
  const logout = useAuthStore((s) => s.logout);
  const toast = useUIStore((s) => s.toast);
  const messages = useMessages();
  const p = messages.ui.profile;
  const auth = messages.ui.auth;
  const common = messages.ui.common;

  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    mobile: user?.mobile ?? "",
    email: user?.email ?? "",
    avatarEmoji: user?.avatarEmoji ?? "💰",
    avatarColor: user?.avatarColor ?? "#0ea5e9",
    securityQuestion: user?.securityQuestion ?? "",
  });
  const [saving, setSaving] = useState(false);

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [securitySaving, setSecuritySaving] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [recoveryNewPin, setRecoveryNewPin] = useState("");
  const [recoveryConfirmPin, setRecoveryConfirmPin] = useState("");
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryErr, setRecoveryErr] = useState<string | null>(null);

  if (!user) return null;

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.id, form);
      await refresh();
      toast({ title: p.updated, kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : p.saveFailed, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function savePin() {
    if (!user) return;
    setPinErr(null);
    const pinError = validatePin(newPin, auth);
    if (pinError) {
      setPinErr(pinError);
      return;
    }
    if (newPin === oldPin) {
      setPinErr(auth.pinDifferent);
      return;
    }
    if (newPin !== confirmNew) {
      setPinErr(auth.pinsMismatch);
      return;
    }
    setPinSaving(true);
    try {
      await changePin(user.id, oldPin, newPin);
      setOldPin("");
      setNewPin("");
      setConfirmNew("");
      toast({ title: p.pinChanged, kind: "success" });
      await logout();
    } catch (e) {
      setPinErr(e instanceof Error ? e.message : auth.pinChangeFailed);
    } finally {
      setPinSaving(false);
    }
  }

  async function saveSecurityRecovery() {
    if (!user) return;
    setSecuritySaving(true);
    try {
      await saveSecurityAnswerService(user.id, form.securityQuestion, securityAnswer, securityPin);
      setSecurityAnswer("");
      setSecurityPin("");
      toast({ title: p.recoveryUpdated, kind: "success" });
      await refresh();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : p.recoveryFailed, kind: "error" });
    } finally {
      setSecuritySaving(false);
    }
  }

  async function recoverPin() {
    if (!user) return;
    setRecoveryErr(null);
    const pinError = validatePin(recoveryNewPin, auth);
    if (pinError) {
      setRecoveryErr(pinError);
      return;
    }
    if (recoveryNewPin !== recoveryConfirmPin) {
      setRecoveryErr(auth.pinsMismatch);
      return;
    }
    setRecoverySaving(true);
    try {
      await resetPinWithSecurityAnswer(user.id, recoveryAnswer, recoveryNewPin);
      setRecoveryAnswer("");
      setRecoveryNewPin("");
      setRecoveryConfirmPin("");
      toast({ title: p.pinReset, kind: "success" });
      await logout();
    } catch (e) {
      setRecoveryErr(e instanceof Error ? e.message : p.pinResetFailed);
    } finally {
      setRecoverySaving(false);
    }
  }

  return (
    <div>
      <PersonalPageHeader screen="profile" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-5xl text-white shadow-lg"
              style={{ backgroundColor: form.avatarColor }}
            >
              {form.avatarEmoji}
            </div>
            <div className="mt-3 text-lg font-semibold">{form.displayName || user.username}</div>
            <div className="text-xs text-muted-foreground">
              @{user.username}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {user.mobile ? <Badge variant="outline">{user.mobile}</Badge> : null}
              {user.email ? <Badge variant="outline">{user.email}</Badge> : null}
            </div>
            <div className="mt-4 w-full space-y-2 text-left text-xs">
              <InfoRow label={p.profileId} value={user.id.slice(0, 12) + "…"} />
              <InfoRow label={p.created} value={formatDate(user.createdAt)} />
              <InfoRow
                label={p.lastLogin}
                value={user.lastLoginAt ? formatDate(user.lastLoginAt) : "—"}
              />
            </div>
            <div className="mt-4 flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => lock()}>
                <Lock className="h-4 w-4" /> {common.lock}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => logout()}>
                <LogOut className="h-4 w-4" /> {common.logout}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5" />
                <CardTitle>{p.personal}</CardTitle>
              </div>
              <CardDescription>{p.personalHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Field label={p.displayName} className="col-span-2">
                  <Input
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  />
                </Field>
                <Field label={p.mobile}>
                  <Input
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    placeholder="+91…"
                  />
                </Field>
                <Field label={p.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label={p.avatarEmoji} className="col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className={`h-9 w-9 rounded-lg text-lg ring-2 transition ${
                          form.avatarEmoji === e
                            ? "ring-primary bg-[hsl(var(--primary-soft))]"
                            : "ring-transparent bg-surface-2 hover:bg-surface-3"
                        }`}
                        onClick={() => setForm({ ...form, avatarEmoji: e })}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={p.avatarColor} className="col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-8 w-8 rounded-full ring-2 transition ${
                          form.avatarColor === c
                            ? "ring-foreground scale-110"
                            : "ring-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm({ ...form, avatarColor: c })}
                      />
                    ))}
                  </div>
                </Field>
                <Field label={p.securityQuestion} className="col-span-2">
                  <Input
                    value={form.securityQuestion}
                    onChange={(e) =>
                      setForm({ ...form, securityQuestion: e.target.value })
                    }
                    placeholder={p.securityQuestionPh}
                  />
                </Field>
                <Field label={p.currentPinRecovery} className="col-span-2">
                  <Input aria-label={p.currentPinRecovery} type="password" autoComplete="current-password" value={securityPin} onChange={e => setSecurityPin(e.target.value)} />
                </Field>
                <Field label={p.securityAnswer} className="col-span-2">
                  <Input
                    type="password"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder={p.secretPh}
                  />
                </Field>
              </div>
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={saveSecurityRecovery} loading={securitySaving}>
                    {p.saveRecovery}
                  </Button>
                  <Button onClick={saveProfile} loading={saving}>
                  <Save className="h-4 w-4" /> {p.saveProfile}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>{p.changePin}</CardTitle>
              </div>
              <CardDescription>{p.changePinHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label={p.currentPin} required>
                  <Input
                    type="password"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                  />
                </Field>
                <Field label={p.newPin} required>
                  <Input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                  />
                </Field>
                <Field label={p.confirmNew} required>
                  <Input
                    type="password"
                    value={confirmNew}
                    onChange={(e) => setConfirmNew(e.target.value)}
                  />
                </Field>
              </div>
              {pinErr ? (
                <div className="mt-2 rounded-md bg-expense-soft p-2 text-xs text-danger">
                  {pinErr}
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <Button onClick={savePin} loading={pinSaving}>
                  <Save className="h-4 w-4" /> {p.updatePin}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                <CardTitle>{p.forgot}</CardTitle>
              </div>
              <CardDescription>{p.forgotHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label={p.securityAnswer} required>
                  <Input
                    type="password"
                    value={recoveryAnswer}
                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                  />
                </Field>
                <Field label={p.newPin} required>
                  <Input
                    type="password"
                    value={recoveryNewPin}
                    onChange={(e) => setRecoveryNewPin(e.target.value)}
                  />
                </Field>
                <Field label={p.confirmNewPin} required>
                  <Input
                    type="password"
                    value={recoveryConfirmPin}
                    onChange={(e) => setRecoveryConfirmPin(e.target.value)}
                  />
                </Field>
              </div>
              {recoveryErr ? (
                <div className="mt-2 rounded-md bg-expense-soft p-2 text-xs text-danger">
                  {recoveryErr}
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <Button onClick={recoverPin} loading={recoverySaving}>
                  {p.resetVia}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface-2 px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
