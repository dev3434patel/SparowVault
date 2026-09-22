# Build warnings classification — core freeze

Date: 2026-09-22  
Build: `npm run build` exit **0**

| Warning | Classification | Action |
|---------|----------------|--------|
| Dynamic+static import of `database.ts` / `repositories` | **ACCEPTED** — known Vite chunking note; statement dialog still code-splits | No change required for freeze |
| Chunks > 500 kB (`index-*.js`, StatementImportDialog) | **ACCEPTED** — statement OCR/PDF.js weight expected; lazy dialog already split | Future perf work, not freeze blocker |
| PowerShell NativeCommandError noise on vite reporter stderr | **NOISE** — build succeeded | Ignore |

No certification-critical skipped checks in this build.
