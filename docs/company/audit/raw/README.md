# Company audit evidence — raw phase logs

One log file per remediation / audit phase.

## Naming

| File | When |
|------|------|
| `PHASE_00.log` | Foundation hygiene (dead code, logout isolation, commit baseline) |
| `PHASE_NN.log` | Subsequent numbered phases |

## Contents (required sections)

1. **Objective** — one line
2. **Commands run** — exact commands
3. **Results** — pass/fail counts, key greps
4. **Files touched** — create/update/delete
5. **Secrets scan** — confirmation no credentials staged
6. **Timestamp** — ISO-8601

Do not put PINs, tokens, DB passwords, or live session cookies in these logs.
Use redaction (`PIN=***`) if a command output would otherwise leak them.
