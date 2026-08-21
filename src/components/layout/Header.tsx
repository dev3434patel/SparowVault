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
import { Bell, Lock, LogOut, Plus, Search, User2, Users } from "lucide-react";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { SyncOutboxBadge } from "@/components/layout/SyncOutboxBadge";
import { useNavStore } from "@/store/navStore";
import { useDataStore } from "@/store/dataStore";
import { useMemo } from "react";

export function Header() {
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
        onClick={() => setCommandOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-muted-foreground hover:bg-surface-2 sm:max-w-md"
      >
        <Search className="h-4 w-4" />
        <span className="hidden min-w-0 flex-1 truncate min-[430px]:block">Quick search, jump to section…</span>
        <kbd className="hidden sm:inline-flex rounded border border-border bg-card px-1.5 py-0.5 text-[10px]">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <SyncOutboxBadge />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="shadow" aria-label="Quick Add">
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Add a transaction</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openQuickAdd("income")}>
              Income
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openQuickAdd("expense")}>
              Expense
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openQuickAdd("transfer")}>
              Transfer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Alerts"
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
            <button className="flex items-center gap-2 rounded-md pr-1 hover:bg-surface-2">
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
                  <User2 className="h-4 w-4" /> Profile & Security
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActive("settings")}>
                  <Users className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => lock()}>
                  <Lock className="h-4 w-4" /> Lock session
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={() => logout()}>
                  <LogOut className="h-4 w-4" /> Logout / Switch profile
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
