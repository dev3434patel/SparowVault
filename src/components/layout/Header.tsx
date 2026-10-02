import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown";
import { Bell, Lock, LogOut, Plus, Search, User2, Users, Upload } from "lucide-react";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { SyncOutboxBadge } from "@/components/layout/SyncOutboxBadge";
import { useNavStore } from "@/store/navStore";
import { useDataStore } from "@/store/dataStore";
import { lazy, Suspense, useMemo, useState } from "react";
import { useMessages } from "@/i18n/useMessages";

const StatementImportDialog = lazy(() => import("@/components/statements/StatementImportDialog"));

export function Header() {
  const messages = useMessages();
  const layout = messages.ui.layout;
  const [statementOpen, setStatementOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const lock = useAuthStore((s) => s.lock);
  const openQuickAdd = useUIStore((s) => s.openQuickAdd);
  const setAlertsOpen = useUIStore((s) => s.setAlertsOpen);
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  const setActive = useNavStore((s) => s.setActive);
  const alerts = useDataStore((s) => s.alerts);

  const alertCount = useMemo(
    () => alerts.filter((a) => !a.dismissed).length,
    [alerts],
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:gap-3 sm:px-4">
      <button
        aria-label={layout.searchSections}
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-muted-foreground hover:bg-surface-2 sm:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="hidden min-w-0 flex-1 truncate min-[430px]:block">{layout.searchHint}</span>
        <kbd className="hidden sm:inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px]">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <SyncOutboxBadge />
        <Button variant="outline" size="icon-sm" aria-label={layout.uploadStatement} title={layout.uploadStatement} onClick={() => setStatementOpen(true)}><Upload className="h-4 w-4" /></Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="shadow" aria-label={layout.quickAdd}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{layout.quickAdd}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{layout.addTransaction}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openQuickAdd("income")}>
              {layout.income}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openQuickAdd("expense")}>
              {layout.expense}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openQuickAdd("transfer")}>
              {layout.transfer}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label={layout.alerts}
          onClick={() => setAlertsOpen(true)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-h-[18px] min-w-[18px] rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          ) : null}
        </Button>

        <ThemeSwitch compact />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button aria-label={layout.profileMenu} className="flex items-center gap-2 rounded-md pr-1 hover:bg-surface-2">
              {currentUser ? (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.avatarEmoji}
                </div>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {currentUser ? (
              <>
                <DropdownMenuLabel>
                  <div className="font-semibold">{currentUser.displayName}</div>
                  <div className="text-[11px] font-normal text-muted-foreground">
                    @{currentUser.username}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setActive("profile")}>
                  <User2 className="h-4 w-4" /> {layout.profileSecurity}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActive("settings")}>
                  <Users className="h-4 w-4" /> {layout.settings}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => lock()}>
                  <Lock className="h-4 w-4" /> {layout.lockSession}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => logout()}>
                  <LogOut className="h-4 w-4" /> {layout.logoutSwitch}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {statementOpen && <Suspense fallback={<span role="status" className="sr-only">{layout.loadingStatement}</span>}><StatementImportDialog onClose={() => setStatementOpen(false)} /></Suspense>}
    </header>
  );
}
