import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { changePin } from "@/services/authService";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useMessages } from "@/i18n/useMessages";

export function RequiredPinChange() {
  const auth = useMessages().ui.auth;
  const user = useAuthStore(s => s.currentUser);
  const logout = useAuthStore(s => s.logout);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="space-y-4" onSubmit={async e => {
    e.preventDefault(); if (!user || busy) return;
    if (next !== confirmation) { setError(auth.pinsMismatch); return; }
    setBusy(true); setError("");
    try { await changePin(user.id, current, next); await logout(); }
    catch (error) { setError(error instanceof Error ? error.message : auth.pinChangeFailed); }
    finally { setBusy(false); setCurrent(""); setNext(""); setConfirmation(""); }
  }}>
    <h1 className="text-xl font-semibold">{auth.changeTempPin}</h1>
    <label className="grid gap-2 text-sm">{auth.currentPin}<Input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required /></label>
    <label className="grid gap-2 text-sm">{auth.newPin}<Input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required /></label>
    <label className="grid gap-2 text-sm">{auth.confirmNewPin}<Input type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex gap-2"><Button type="submit" loading={busy}>{auth.changePin}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void logout()}>{auth.signOut}</Button></div>
  </form>;
}
