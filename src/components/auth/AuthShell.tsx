import { motion } from "framer-motion";
import { IndianRupee } from "lucide-react";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg min-h-screen w-full flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--goal))] text-white shadow-lg">
            <IndianRupee className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none tracking-tight">SparowVault</div>
            <div className="text-[11px] text-muted-foreground">
              Personal Finance OS
            </div>
          </div>
        </div>
        <ThemeSwitch />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[440px]"
        >
          {children}
        </motion.div>
      </main>
      <footer className="px-6 py-4 text-center text-[11px] text-muted-foreground">
        SQL-first mode: account and finance data are managed through secure server APIs.
      </footer>
    </div>
  );
}
