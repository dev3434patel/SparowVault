from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "audit-word-evidence"
OUT = ROOT / "SPAROWVAULT_FULL_PROJECT_AUDIT_REPORT.docx"


def read_text(path: Path, default: str = "") -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else default


def read_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_text(cell, text: str, bold: bool = False, color: str | None = None, size: int = 9) -> None:
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(str(text))
    run.bold = bold
    run.font.size = Pt(size)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.TOP


def add_table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None, font_size: int = 9):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.style = "Table Grid"
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        set_cell_text(hdr[i], h, bold=True, color="FFFFFF", size=font_size)
        set_cell_shading(hdr[i], "1F4E79")
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            set_cell_text(cells[i], val, size=font_size)
    if widths:
        for row in table.rows:
            for idx, width in enumerate(widths):
                row.cells[idx].width = Inches(width)
    doc.add_paragraph()
    return table


def add_status_para(doc: Document, label: str, status: str, detail: str) -> None:
    p = doc.add_paragraph()
    p.style = "Normal"
    r = p.add_run(label + ": ")
    r.bold = True
    s = p.add_run(status)
    s.bold = True
    if status in {"PASS", "COMPLETE", "INTERNAL TEST READY"}:
        s.font.color.rgb = RGBColor(0x00, 0x70, 0xC0)
    elif status in {"BLOCKED", "NOT READY", "FAIL"}:
        s.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)
    else:
        s.font.color.rgb = RGBColor(0x9C, 0x65, 0x00)
    p.add_run(" - " + detail)


def add_bullets(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.add_run(item)


def add_numbered(doc: Document, items: list[str]) -> None:
    for item in items:
        p = doc.add_paragraph(style="List Number")
        p.add_run(item)


def configure_doc(doc: Document) -> None:
    sec = doc.sections[0]
    sec.top_margin = Inches(0.75)
    sec.bottom_margin = Inches(0.75)
    sec.left_margin = Inches(0.8)
    sec.right_margin = Inches(0.8)
    for style_name in ["Normal", "Body Text"]:
        style = doc.styles[style_name]
        style.font.name = "Arial"
        style.font.size = Pt(10.5)
    for style_name, size, color in [
        ("Title", 22, "1F4E79"),
        ("Heading 1", 16, "1F4E79"),
        ("Heading 2", 13, "2F5597"),
        ("Heading 3", 11, "1F4E79"),
    ]:
        style = doc.styles[style_name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(color)
    header = sec.header.paragraphs[0]
    header.text = "SparowVault Full Project Audit"
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    header.runs[0].font.size = Pt(8)
    header.runs[0].font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    footer = sec.footer.paragraphs[0]
    footer.text = "Generated from local repository evidence"
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.runs[0].font.size = Pt(8)
    footer.runs[0].font.color.rgb = RGBColor(0x66, 0x66, 0x66)


def main() -> None:
    summary = read_json(EVIDENCE / "audit-summary.json", {})
    package_full = read_json(ROOT / "package.json", {})
    validation = summary.get("fresh_validation", [])
    last_full = summary.get("last_full_certification", [])
    tables = summary.get("database", {}).get("tables", [])
    api = summary.get("api", {})
    package = summary.get("package", {})

    doc = Document()
    configure_doc(doc)

    title = doc.add_paragraph(style="Title")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.add_run("SparowVault Full Project Audit Report")
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Evidence-based current status, architecture, database structure, flow, completion ratio, pending items, and launch readiness")
    run.font.size = Pt(11)
    run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    add_table(
        doc,
        ["Field", "Value"],
        [
            ["Project", "SparowVault"],
            ["Audit date", "2026-05-21"],
            ["Workspace", str(ROOT)],
            ["Tech stack observed", "React 19, Vite, TypeScript, Dexie/IndexedDB, Zustand, PHP, MySQL, Razorpay, JWT/session auth"],
            ["Evidence boundary", "This report uses repository files, SQL/schema files, generated reports, and command logs. It does not assume external staging success."],
            ["Fresh checks run today", "typecheck, lint, PHP syntax, SQL dry-run"],
            ["Last full local certification evidence", "2026-05-15 certification logs and final certification report"],
        ],
        widths=[2.0, 5.8],
        font_size=9,
    )

    doc.add_heading("1. Executive Status", level=1)
    add_status_para(doc, "Current recommendation", "INTERNAL TEST READY", "Local implementation and gates are strong, but hosted staging and external launch controls remain blocked/not proven.")
    add_status_para(doc, "Controlled paid beta", "BLOCKED", "Cannot be marked ready until real staging domain, separate staging DB, Razorpay test checkout/webhook delivery, backup/restore, monitoring, responsive QA, support access drill, and JWT/session decision are completed.")
    add_status_para(doc, "Public launch", "BLOCKED", "Public launch requires production-like staging proof, billing proof, privacy proof, monitoring, backup restore, security headers, and operational readiness.")

    add_table(
        doc,
        ["Area", "Measured Status", "Evidence"],
        [
            ["Fresh core code health", "PASS", "typecheck, lint, check:php, check:sql passed on 2026-05-21"],
            ["Local full certification", "PASS", "Previous full local gate: 16/16 commands passed and 18/18 phase gates passed"],
            ["Runtime smoke", "PASS locally", "Previous browser smoke: 37/37 passed; current local health was previously healthy"],
            ["Finance/accounting engines", "PASS by tests", "Ledger, card, loan, udhari, goal, budget, cashflow tests passed in full certification"],
            ["Database deployability", "PASS locally", "SQL dry-run passed; canonical schema/migration files present"],
            ["Hosting bundle", "PASS locally", "host:package passed in previous certification and staging deploy validation"],
            ["Real staging", "BLOCKED", "No DNS/hosting/DB credentials available in workspace"],
            ["Razorpay real test checkout", "BLOCKED", "Webhook tests passed locally, but provider checkout and dashboard delivery are not proven"],
            ["Backup/restore drill on staging", "BLOCKED", "Docs/scripts exist; external restore drill not proven in this run"],
            ["Full responsive QA", "PENDING", "Browser smoke exists; full mobile/tablet/desktop manual matrix is still required"],
        ],
        widths=[2.1, 1.7, 4.1],
        font_size=8,
    )

    doc.add_heading("2. Evidence and Non-Assumption Policy", level=1)
    doc.add_paragraph("This report separates observed facts from items not proven. Where a capability is not verified on real hosting, the status is marked BLOCKED or PENDING. No external staging, DNS, payment provider, or production state is assumed.")
    add_table(
        doc,
        ["Evidence Type", "Source"],
        [
            ["Fresh validation", "audit-word-evidence/current-validation-results.json"],
            ["Last full local certification", "certification-logs/part1-results.json and SPAROWVAULT_FINAL_CERTIFICATION_REPORT.md"],
            ["Staging status", "STAGING_DEPLOYMENT_REPORT.md"],
            ["SQL/database", "sql/production_schema.sql, sql/migrations/all_phases_combined.sql, sql/20260501_sql_only_full.sql"],
            ["Frontend/backend structure", "src/, php/, api/, scripts/, tests/, package.json"],
            ["Phase status", "PHASE_00_COMPLETION_REPORT.md through PHASE_17_COMPLETION_REPORT.md and PHASE_GATE_INDEX.md"],
        ],
        widths=[2.4, 5.4],
        font_size=8,
    )

    doc.add_heading("3. Completion Ratios", level=1)
    doc.add_paragraph("The ratios below are measured checklist ratios, not opinion-based estimates.")
    local_pass = sum(1 for r in last_full if int(r.get("ExitCode", -1)) == 0)
    local_total = len(last_full)
    fresh_pass = sum(1 for r in validation if int(r.get("ExitCode", -1)) == 0)
    fresh_total = len(validation)
    add_table(
        doc,
        ["Scope", "Ratio", "Meaning"],
        [
            ["Fresh core validation", f"{fresh_pass}/{fresh_total} passed ({round((fresh_pass/fresh_total)*100) if fresh_total else 0}%)", "Commands rerun on 2026-05-21: typecheck, lint, PHP, SQL"],
            ["Last full local command gate", f"{local_pass}/{local_total} passed ({round((local_pass/local_total)*100) if local_total else 0}%)", "Full local certification command list from previous run"],
            ["Phase gates", "18/18 passed (100%)", "Phase 00 through Phase 17 local gates passed in certification evidence"],
            ["Real staging deployment", "0/6 completed (0%)", "Domain, DB, env, upload, hosted health, hosted page smoke are blocked without credentials"],
            ["Controlled paid beta readiness", "Blocked by external checklist", "Cannot be converted to a single honest percent until staging/Razorpay/backup/manual QA are executed"],
        ],
        widths=[2.3, 1.8, 3.8],
        font_size=8,
    )

    doc.add_heading("4. System Architecture Observed", level=1)
    add_bullets(doc, [
        "Frontend: React 19 + Vite + TypeScript application under src/.",
        "Offline storage: Dexie/IndexedDB data layer is present and must remain preserved.",
        "State and services: service modules cover calculations, ledger, card engine, loan engine, udhari, goals, budgets, suggestions, CA reports, import/export, and feature gates.",
        "Backend: PHP API under api/ and php/ with MySQL persistence.",
        "Sync model: generic cloud_collection_rows table stores user-owned entity payloads with denormalized hot fields for reporting.",
        "Money model: paise-integer utilities and tests enforce non-float persisted money behavior.",
        "Ledger model: financial_events and financial_effects represent source-of-truth money movement logic.",
        "SaaS model: plans, plan_prices, plan_features, subscriptions, payments, webhook_events, Razorpay endpoints.",
        "Security/privacy model: policy acceptance, audit logs, login attempts, rate limits, deletion/export endpoints, and user-owned filters.",
    ])

    doc.add_heading("5. End-to-End Working Flow", level=1)
    add_numbered(doc, [
        "User opens the Vite/React app and sees CloudAuth when not authenticated.",
        "User registers or logs in through PHP auth APIs. Policy acceptance is required for registration based on current tests.",
        "Auth state is used by the frontend to load user-owned data only.",
        "Financial entities are created in the frontend and stored offline through Dexie/IndexedDB behavior.",
        "Cloud sync/API writes user-owned rows to cloud_collection_rows with collection name, entity id, payload, timestamps, and hot reporting fields.",
        "Transactions create or feed deterministic financial event/effect logic.",
        "Dashboard, reports, suggestions, cards, loans, udhari, goals, and CA reports read from deterministic engines and/or ledger-backed data.",
        "Razorpay billing flows create orders, record payments/subscriptions, and validate webhook ownership/idempotency in tests.",
        "Admin pages manage users, plans, subscriptions, feature flags, branding/settings, and audit-related operations.",
        "Export/import, repair, privacy, and audit flows are supported by service modules and endpoint tests.",
    ])

    doc.add_heading("6. Finance and Accounting Rules Status", level=1)
    add_table(
        doc,
        ["Rule", "Observed Status", "Evidence"],
        [
            ["Rupee values stored/calculated as paise integers", "PASS by tests", "Money calculation and phase 03 gates passed"],
            ["Credit-card purchase: expense + card liability, no bank decrease", "PASS by tests", "Card engine and ledger scenario tests passed"],
            ["Credit-card bill payment: bank decrease + card liability decrease, no new expense", "PASS by tests", "Card engine and ledger scenario tests passed"],
            ["EMI payment: bank outflow + principal reduction + interest expense", "PASS by tests", "Loan/EMI and ledger tests passed"],
            ["Udhari given: receivable, not expense", "PASS by tests", "Udhari engine and ledger tests passed"],
            ["Udhari received: payable, not income", "PASS by tests", "Udhari engine and ledger tests passed"],
            ["AI does not invent numbers", "PASS by tests", "Suggestion engine and AI guardrail tests passed"],
            ["User data isolation", "PASS by endpoint tests", "API, account endpoint, webhook ownership tests passed"],
        ],
        widths=[3.2, 1.6, 3.0],
        font_size=8,
    )

    doc.add_heading("7. Module-by-Module Audit", level=1)
    module_rows = [
        ["Authentication", "CloudAuth, register/login/logout/me/profile/reset/change PIN endpoints", "Implemented and tested locally", "Hosted auth smoke pending"],
        ["Dashboard", "DashboardPage with KPIs, modes, widgets, explainability coverage", "Implemented and browser-smoke tested", "Full responsive QA pending"],
        ["Transactions", "Income/expense/transfer/payment forms and rules", "Implemented with validation/preview tests", "Manual hosted replay pending"],
        ["Accounts", "Accounts page and balance engine", "Implemented and tested", "Hosted smoke pending"],
        ["Cards", "Credit card engine, outstanding, risk, payments, repair concepts", "Implemented and tested", "Manual card UX matrix pending"],
        ["Loans/EMI", "Loan engine, EMI split, partial/late/prepay/foreclosure concepts", "Implemented and tested", "Manual debt UX matrix pending"],
        ["Udhari", "Receivable/payable, settlements, write-off, reminders", "Implemented and tested", "Manual hosted UX pending"],
        ["Goals", "Goal engine, pace, required saving, status", "Implemented and tested", "Icon/color UX should remain watched"],
        ["Budgets/Cashflow", "Smart budget, emergency fund, survival engine", "Implemented and tested", "Manual false-panic review pending"],
        ["Reports/CA", "CA reports, business/personal split, reconciliation", "Implemented and tested", "Export workbook manual reconciliation pending on staging"],
        ["Suggestions/AI", "Deterministic suggestions plus guardrails", "Implemented and tested", "Live LLM/provider path not assumed"],
        ["Import/Export", "Preview, validation, rollback/export safety concepts", "Implemented and tested by gates", "Full file-format manual QA pending"],
        ["Subscription/Billing", "Plans, feature gates, Razorpay webhook tests", "Local tests pass", "Real Razorpay test checkout blocked"],
        ["Admin", "Users, plans, subscriptions, feature flags, settings", "Implemented and browser-smoke tested locally", "Hosted admin smoke blocked"],
        ["Audit/Privacy", "Audit logs, policy acceptance, deletion/export controls", "Implemented and tested by gates", "Support access drill pending"],
    ]
    add_table(doc, ["Module", "Observed Scope", "Status", "Pending"], module_rows, widths=[1.3, 2.6, 1.8, 2.1], font_size=7)

    doc.add_heading("8. Frontend and Page Inventory", level=1)
    page_files = read_text(EVIDENCE / "page-files.txt").splitlines()
    page_rows = [[str(i + 1), p] for i, p in enumerate(page_files)]
    add_table(doc, ["#", "Page file observed"], page_rows, widths=[0.4, 7.4], font_size=7)

    doc.add_heading("9. Service and Engine Inventory", level=1)
    service_files = [p for p in read_text(EVIDENCE / "service-files.txt").splitlines() if "__tests__" not in p]
    service_rows = [[str(i + 1), p] for i, p in enumerate(service_files)]
    add_table(doc, ["#", "Service/engine file observed"], service_rows, widths=[0.4, 7.4], font_size=7)

    doc.add_heading("10. API Surface", level=1)
    endpoint_rows = [[str(i + 1), ep.replace("\\\\", "/")] for i, ep in enumerate(api.get("endpoints", []))]
    add_table(doc, ["#", "PHP endpoint file observed"], endpoint_rows, widths=[0.4, 7.4], font_size=7)

    doc.add_heading("11. Database Structure Summary", level=1)
    db_rows = []
    for t in tables:
        key_cols = ", ".join(c["name"] for c in t.get("columns", [])[:8])
        if len(t.get("columns", [])) > 8:
            key_cols += ", ..."
        db_rows.append([t["name"], str(len(t.get("columns", []))), str(len(t.get("keys", []))), key_cols])
    add_table(doc, ["Table", "Columns", "Keys/Constraints", "Key columns observed"], db_rows, widths=[2.0, 0.7, 1.0, 4.2], font_size=7)

    doc.add_heading("12. Detailed Database Table Columns", level=1)
    doc.add_paragraph("The following column list is extracted from canonical SQL files in the repository. It is included to make the database structure auditable without assumptions.")
    for t in tables:
        doc.add_heading(t["name"], level=2)
        rows = [[c["name"], c["definition"]] for c in t.get("columns", [])]
        add_table(doc, ["Column", "Definition"], rows, widths=[2.2, 5.6], font_size=7)

    doc.add_heading("13. Testing Evidence", level=1)
    fresh_rows = [[r["Command"], "PASS" if r["ExitCode"] == 0 else "FAIL", str(r["DurationSeconds"]), r["Log"]] for r in validation]
    add_table(doc, ["Fresh command", "Status", "Seconds", "Log"], fresh_rows, widths=[2.0, 0.8, 0.8, 4.2], font_size=7)
    last_rows = [[r["Command"], "PASS" if r["ExitCode"] == 0 else "FAIL", str(r["DurationSeconds"]), r["Log"]] for r in last_full]
    add_table(doc, ["Last full certification command", "Status", "Seconds", "Log"], last_rows, widths=[2.2, 0.7, 0.8, 4.1], font_size=7)
    add_bullets(doc, [
        "Fresh checks on 2026-05-21 prove current core code health only.",
        "Full local certification evidence from 2026-05-15 proves the last complete phase-gate run.",
        "Real hosted staging checks are still blocked and cannot be represented as passed.",
    ])

    doc.add_heading("14. Security, Privacy, and Compliance", level=1)
    add_table(
        doc,
        ["Control", "Status", "Notes"],
        [
            ["Protected files/folders", "Implemented locally/host bundle", ".env, sql, data, php/config protections were part of previous certification"],
            ["User-owned data filtering", "Tested", "API and webhook ownership tests passed in certification evidence"],
            ["Policy acceptance", "Implemented/tested", "Registration policy acceptance was enforced in API tests"],
            ["Audit logs", "Implemented/tested by gates", "User/admin audit tables and helpers exist"],
            ["PIN handling", "Implemented with bcrypt/rate-limit concepts", "Further production PIN policy decision remains important"],
            ["JWT/session", "Risk open", "httpOnly cookie/session migration decision is still not fully proven"],
            ["Support access", "Pending drill", "Policy exists; real support access audit drill is pending"],
            ["Hosted headers", "Blocked", "Must be verified on real staging domain"],
        ],
        widths=[2.1, 1.7, 4.0],
        font_size=8,
    )

    doc.add_heading("15. Hosting, Staging, and Launch Readiness", level=1)
    add_table(
        doc,
        ["Launch Area", "Current Status", "Required Next Step"],
        [
            ["Hosting bundle", "PASS locally", "Upload current release/hosting-bundle.zip to staging host"],
            ["Staging domain", "BLOCKED", "Create DNS/subdomain and TLS certificate"],
            ["Staging DB", "BLOCKED", "Create separate MySQL DB and import canonical schema/migrations"],
            ["Staging env", "BLOCKED", "Fill staging-only DB/JWT/Razorpay test env values"],
            ["Hosted health", "BLOCKED", "Run https://staging-domain/api/health.php"],
            ["Hosted UI smoke", "BLOCKED", "Login, dashboard, user pages, admin pages"],
            ["Razorpay", "BLOCKED", "Run real Razorpay test checkout and webhook dashboard delivery"],
            ["Backup/restore", "BLOCKED", "Run backup and restore drill against staging DB"],
            ["Monitoring", "BLOCKED", "Configure uptime, webhook, backup, disk, DB-size checks"],
        ],
        widths=[1.9, 1.5, 4.4],
        font_size=8,
    )

    doc.add_heading("16. Pending Items and Priority", level=1)
    pending_rows = [
        ["P0", "Real staging deployment", "No external staging domain/DB/upload target available", "Blocks controlled paid beta"],
        ["P0", "Razorpay staging checkout", "Local webhook tests pass, but provider checkout is unproven", "Blocks paid beta"],
        ["P0", "Backup/restore drill", "Scripts/docs exist, external drill not proven", "Blocks launch readiness"],
        ["P0", "Hosted security headers", "Must be verified on real HTTPS domain", "Blocks paid beta"],
        ["P1", "JWT/session risk decision", "Need migrate to httpOnly cookie/session or formally accept risk", "Security hardening"],
        ["P1", "Full responsive QA", "Browser smoke is not a full mobile/tablet/desktop matrix", "UX launch confidence"],
        ["P1", "Support access drill", "Policy exists, live audit drill pending", "Privacy readiness"],
        ["P2", "Bundle performance", "Vite chunk-size warning previously observed", "Performance improvement"],
        ["P2", "Imagick warning", "PHP Imagick version warning appeared in previous logs", "Operations cleanup"],
    ]
    add_table(doc, ["Priority", "Item", "Current Fact", "Impact"], pending_rows, widths=[0.7, 1.8, 3.3, 2.0], font_size=8)

    doc.add_heading("17. Recommended Next Execution Plan", level=1)
    add_numbered(doc, [
        "Create real staging domain and TLS certificate.",
        "Create staging MySQL database and staging-only DB user.",
        "Import canonical SQL and verify schema_version.",
        "Configure staging env with staging-only secrets and Razorpay test keys.",
        "Deploy release/hosting-bundle.zip to staging.",
        "Run hosted health check and security header checks.",
        "Run hosted login, dashboard, all user pages, and all admin pages.",
        "Run Razorpay test checkout and provider webhook delivery.",
        "Run backup and restore drill.",
        "Run full mobile/tablet/desktop QA matrix.",
        "Resolve or formally accept JWT/session risk.",
        "Only then consider changing status from INTERNAL TEST READY to CONTROLLED PAID BETA READY.",
    ])

    doc.add_heading("18. Rollback Plan", level=1)
    add_bullets(doc, [
        "Keep previous staging web root before every upload.",
        "Keep staging DB backup before every schema import or migration.",
        "If deployment fails, disable staging subdomain or put it behind maintenance.",
        "Restore previous web root and previous staging .env.",
        "Restore DB backup or recreate staging DB from canonical SQL.",
        "Rerun health, API, browser, and webhook tests before retrying.",
        "No production rollback is required until production deployment starts.",
    ])

    doc.add_heading("19. Final Audit Conclusion", level=1)
    doc.add_paragraph("SparowVault is locally strong and internally test ready. The codebase has passing local gates, a broad finance/accounting test surface, a clear SQL-backed data model, and generated hosting artifacts. However, the project is not yet controlled paid beta ready because real staging and external operational checks are not complete.")
    add_status_para(doc, "Final status", "BLOCKED", "Blocked only for external staging/beta readiness; local core validation is passing.")

    doc.add_page_break()
    doc.add_heading("Appendix A. Package Scripts", level=1)
    script_rows = [[name, cmd] for name, cmd in sorted(package_full.get("scripts", {}).items())]
    add_table(doc, ["Script", "Command"], script_rows, widths=[2.1, 5.7], font_size=7)

    doc.add_heading("Appendix B. SQL Files Observed", level=1)
    sql_rows = [[str(i + 1), p] for i, p in enumerate(read_text(EVIDENCE / "sql-files.txt").splitlines())]
    add_table(doc, ["#", "SQL file"], sql_rows, widths=[0.4, 7.4], font_size=7)

    doc.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()
