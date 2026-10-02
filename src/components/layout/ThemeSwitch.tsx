import { useTheme } from "@/components/theme/ThemeProvider";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { useMessages } from "@/i18n/useMessages";

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { mode, resolved, setMode } = useTheme();
  const theme = useMessages().ui.layout;
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={compact ? "icon-sm" : "sm"} aria-label={theme.toggleTheme}>
          <Icon className="h-4 w-4" />
          {!compact ? <span className="text-xs capitalize">{mode}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>{theme.theme}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setMode("light")}>
          <Sun className="h-4 w-4" /> {theme.light}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setMode("dark")}>
          <Moon className="h-4 w-4" /> {theme.dark}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setMode("system")}>
          <Monitor className="h-4 w-4" /> {theme.system}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
