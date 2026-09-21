# Function Inventory

Named TypeScript functions, arrow assignments, methods, and top-level PHP functions. Anonymous callbacks are not counted. Inventory does not imply every function has a behavioral test.

| Source | Function | Signature | Lines |
| --- | --- | --- | --- |
| src/App.tsx:17 | App | export default function App() | 101 |
| src/App.tsx:37 | onPopState | onPopState = () => syncFromUrl() | 1 |
| src/components/auth/AdminAuth.tsx:13 | AdminAuth | export function AdminAuth() | 58 |
| src/components/auth/AdminAuth.tsx:23 | submit | async function submit(e: FormEvent) | 21 |
| src/components/auth/AuthShell.tsx:5 | AuthShell | export function AuthShell( | 33 |
| src/components/auth/CloudAuth.tsx:15 | validatePin | function validatePin(pin: string) | 8 |
| src/components/auth/CloudAuth.tsx:24 | CloudAuth | export function CloudAuth( | 313 |
| src/components/auth/CloudAuth.tsx:58 | finishLogin | async function finishLogin(sqlUser: | 14 |
| src/components/auth/CloudAuth.tsx:73 | handleSignIn | async function handleSignIn(e: React.FormEvent) | 29 |
| src/components/auth/CloudAuth.tsx:103 | handleRegister | async function handleRegister(e: React.FormEvent) | 51 |
| src/components/auth/LockScreen.tsx:10 | LockScreen | export function LockScreen() | 70 |
| src/components/auth/LockScreen.tsx:19 | submit | async function submit(e: React.FormEvent) | 15 |
| src/components/auth/ProfileLogin.tsx:12 | ProfileLogin | export function ProfileLogin( | 124 |
| src/components/auth/ProfileLogin.tsx:39 | submit | async function submit() | 12 |
| src/components/categories/CategoryCleanupPanel.tsx:19 | CategoryCleanupPanel | export function CategoryCleanupPanel( | 157 |
| src/components/categories/CategoryCleanupPanel.tsx:40 | mergeCategories | async function mergeCategories() | 35 |
| src/components/charts/SafeChart.tsx:4 | SafeChart | export function SafeChart( | 40 |
| src/components/explain/ExplainMetricDrawer.tsx:16 | ExplainMetricTrigger | export function ExplainMetricTrigger( | 95 |
| src/components/finance/CardEmiSimulatorDialog.tsx:17 | CardEmiSimulatorDialog | export function CardEmiSimulatorDialog( | 94 |
| src/components/finance/DataConfidenceBadge.tsx:30 | DataConfidenceBadge | export function DataConfidenceBadge( | 17 |
| src/components/finance/PaydayCashflowPanel.tsx:6 | PaydayCashflowPanel | export function PaydayCashflowPanel(props: | 57 |
| src/components/forms/QuickAddDialog.tsx:24 | QuickAddDialog | export function QuickAddDialog() | 131 |
| src/components/forms/QuickAddDialog.tsx:34 | reset | reset = () => | 6 |
| src/components/forms/QuickAddDialog.tsx:41 | handleClose | handleClose = () => | 4 |
| src/components/forms/TransactionForm.tsx:38 | nowDateInput | function nowDateInput() | 3 |
| src/components/forms/TransactionForm.tsx:42 | TransactionForm | export function TransactionForm( | 663 |
| src/components/forms/TransactionForm.tsx:116 | openish | openish = (u: (typeof udhari)[0]) => u.status !== "settled" && u.status !== "written_off" && udhariAmountPaise(u) > udhariSettledPaise(u) | 2 |
| src/components/forms/TransactionForm.tsx:188 | submit | async function submit(e: React.FormEvent) | 57 |
| src/components/forms/TransactionForm.tsx:246 | fieldError | function fieldError(key: string): string \| undefined | 3 |
| src/components/layout/AdminAppShell.tsx:56 | AdminAppShell | export function AdminAppShell() | 95 |
| src/components/layout/AdminAppShell.tsx:69 | scrollToTop | scrollToTop = () => | 9 |
| src/components/layout/AlertsDrawer.tsx:12 | AlertsDrawer | export function AlertsDrawer() | 142 |
| src/components/layout/AlertsDrawer.tsx:23 | dismiss | async function dismiss(id: string) | 5 |
| src/components/layout/AlertsDrawer.tsx:28 | restore | async function restore(id: string) | 5 |
| src/components/layout/AlertsDrawer.tsx:33 | removeAlert | async function removeAlert(id: string) | 4 |
| src/components/layout/AlertsDrawer.tsx:37 | dismissAll | async function dismissAll() | 5 |
| src/components/layout/AppShell.tsx:79 | AppShell | export function AppShell( | 160 |
| src/components/layout/AppShell.tsx:93 | onKey | function onKey(e: KeyboardEvent) | 6 |
| src/components/layout/AppShell.tsx:110 | scrollToTop | scrollToTop = () => | 9 |
| src/components/layout/CommandPalette.tsx:61 | CommandPalette | export function CommandPalette() | 146 |
| src/components/layout/CommandPalette.tsx:79 | action | action: () => | 4 |
| src/components/layout/CommandPalette.tsx:89 | action | action: () => | 4 |
| src/components/layout/CommandPalette.tsx:100 | action | action: () => | 4 |
| src/components/layout/CommandPalette.tsx:111 | action | action: () => | 4 |
| src/components/layout/CommandPalette.tsx:127 | action | action: () => | 4 |
| src/components/layout/Header.tsx:19 | Header | export function Header() | 112 |
| src/components/layout/PageHeader.tsx:3 | PageHeader | export function PageHeader( | 30 |
| src/components/layout/Sidebar.tsx:73 | Sidebar | export function Sidebar() | 107 |
| src/components/layout/Sidebar.tsx:181 | MobileNav | export function MobileNav() | 34 |
| src/components/layout/SyncOutboxBadge.tsx:12 | SyncOutboxBadge | export function SyncOutboxBadge() | 39 |
| src/components/layout/SyncOutboxBadge.tsx:17 | refresh | refresh = () => setCount(pendingSyncCount()) | 1 |
| src/components/layout/ThemeSwitch.tsx:13 | ThemeSwitch | export function ThemeSwitch( | 28 |
| src/components/pages/AccountsPage.tsx:37 | AccountsPage | export function AccountsPage() | 175 |
| src/components/pages/AccountsPage.tsx:58 | handleDelete | async function handleDelete(id: string) | 21 |
| src/components/pages/AccountsPage.tsx:213 | AccountForm | function AccountForm( | 131 |
| src/components/pages/AccountsPage.tsx:250 | submit | async function submit(e: React.FormEvent) | 22 |
| src/components/pages/AlertsPage.tsx:24 | AlertsPage | export function AlertsPage() | 187 |
| src/components/pages/AlertsPage.tsx:41 | dismiss | async function dismiss(id: string) | 4 |
| src/components/pages/AlertsPage.tsx:45 | restore | async function restore(id: string) | 4 |
| src/components/pages/AlertsPage.tsx:49 | hardDelete | async function hardDelete(id: string) | 4 |
| src/components/pages/AlertsPage.tsx:54 | rerun | async function rerun() | 11 |
| src/components/pages/AlertsPage.tsx:66 | dismissAll | async function dismissAll() | 5 |
| src/components/pages/AlertsPage.tsx:212 | StatCard | function StatCard( | 26 |
| src/components/pages/AlertsPage.tsx:239 | sevScore | function sevScore(s: string) | 3 |
| src/components/pages/AlertsPage.tsx:242 | sevVariant | function sevVariant(s: string): "danger" \| "warning" \| "info" \| "success" | 9 |
| src/components/pages/AlertsPage.tsx:251 | sevBg | function sevBg(s: string) | 9 |
| src/components/pages/AuditPage.tsx:46 | AuditPage | export function AuditPage() | 172 |
| src/components/pages/AuditPage.tsx:75 | exportLogs | function exportLogs() | 13 |
| src/components/pages/BillCalendarPage.tsx:15 | BillCalendarPage | export function BillCalendarPage() | 62 |
| src/components/pages/BudgetsPage.tsx:39 | BudgetsPage | export function BudgetsPage() | 258 |
| src/components/pages/BudgetsPage.tsx:79 | handleDelete | async function handleDelete(id: string) | 24 |
| src/components/pages/BudgetsPage.tsx:298 | BudgetForm | function BudgetForm( | 187 |
| src/components/pages/BudgetsPage.tsx:348 | submit | async function submit(e: React.FormEvent) | 20 |
| src/components/pages/CardsPage.tsx:45 | CardsPage | export function CardsPage() | 722 |
| src/components/pages/CardsPage.tsx:90 | applyRepairLinkCard | async function applyRepairLinkCard() | 21 |
| src/components/pages/CardsPage.tsx:112 | applyRepairConvertUpi | async function applyRepairConvertUpi() | 25 |
| src/components/pages/CardsPage.tsx:138 | applyRepairMarkLegacy | async function applyRepairMarkLegacy() | 24 |
| src/components/pages/CardsPage.tsx:163 | handleDelete | async function handleDelete(id: string) | 25 |
| src/components/pages/CardsPage.tsx:768 | CardForm | function CardForm( | 217 |
| src/components/pages/CardsPage.tsx:818 | submit | async function submit(e: React.FormEvent) | 20 |
| src/components/pages/CategoriesPage.tsx:44 | CategoriesPage | export function CategoriesPage() | 213 |
| src/components/pages/CategoriesPage.tsx:62 | usageCount | function usageCount(c: Category) | 3 |
| src/components/pages/CategoriesPage.tsx:66 | handleArchive | async function handleArchive(c: Category) | 12 |
| src/components/pages/CategoriesPage.tsx:79 | handleDelete | async function handleDelete(c: Category) | 20 |
| src/components/pages/CategoriesPage.tsx:258 | CategoryForm | function CategoryForm( | 206 |
| src/components/pages/CategoriesPage.tsx:321 | submit | async function submit(e: React.FormEvent) | 32 |
| src/components/pages/DashboardPage.tsx:93 | DashboardPage | export function DashboardPage() | 1150 |
| src/components/pages/DashboardPage.tsx:392 | drillCategorySpend | function drillCategorySpend(row: (typeof stats.catBreak)[number]) | 17 |
| src/components/pages/DashboardPage.tsx:1244 | KpiCard | function KpiCard( | 62 |
| src/components/pages/DashboardPage.tsx:1307 | DueRow | function DueRow( | 45 |
| src/components/pages/DashboardPage.tsx:1353 | HealthCard | function HealthCard( | 69 |
| src/components/pages/DashboardPage.tsx:1423 | BudgetList | function BudgetList() | 63 |
| src/components/pages/ExpensesPage.tsx:3 | ExpensesPage | export function ExpensesPage() | 3 |
| src/components/pages/ExportPage.tsx:50 | ExportPage | export function ExportPage() | 458 |
| src/components/pages/ExportPage.tsx:71 | logExport | async function logExport(scope: string, fileName: string, rows: number) | 14 |
| src/components/pages/ExportPage.tsx:86 | caExport | async function caExport() | 27 |
| src/components/pages/ExportPage.tsx:114 | filterTx | function filterTx() | 12 |
| src/components/pages/ExportPage.tsx:127 | quickExport | async function quickExport( scope: string, label: string, buildRows: () => Record<string, unknown>[], ) | 35 |
| src/components/pages/ExportPage.tsx:163 | requestFullBackup | function requestFullBackup() | 5 |
| src/components/pages/ExportPage.tsx:169 | confirmFullBackup | async function confirmFullBackup() | 44 |
| src/components/pages/ExportPage.tsx:509 | ExportCard | function ExportCard( | 34 |
| src/components/pages/GoalsPage.tsx:50 | GoalsPage | export function GoalsPage() | 228 |
| src/components/pages/GoalsPage.tsx:63 | handleDelete | async function handleDelete(id: string) | 21 |
| src/components/pages/GoalsPage.tsx:85 | contribute | async function contribute(g: Goal, amount: number) | 23 |
| src/components/pages/GoalsPage.tsx:279 | ContributeDialog | function ContributeDialog( | 43 |
| src/components/pages/GoalsPage.tsx:323 | GoalForm | function GoalForm( | 214 |
| src/components/pages/GoalsPage.tsx:377 | submit | async function submit(e: React.FormEvent) | 38 |
| src/components/pages/HouseholdDashboardPage.tsx:18 | HouseholdDashboardPage | export function HouseholdDashboardPage() | 154 |
| src/components/pages/HouseholdDashboardPage.tsx:36 | reload | async function reload() | 9 |
| src/components/pages/HouseholdDashboardPage.tsx:50 | createHousehold | async function createHousehold() | 25 |
| src/components/pages/HouseholdDashboardPage.tsx:76 | addMember | async function addMember() | 21 |
| src/components/pages/ImportPage.tsx:88 | ImportPage | export function ImportPage() | 746 |
| src/components/pages/ImportPage.tsx:142 | handleFile | async function handleFile(file: File) | 21 |
| src/components/pages/ImportPage.tsx:164 | validRowCount | function validRowCount() | 11 |
| src/components/pages/ImportPage.tsx:176 | performImport | async function performImport() | 169 |
| src/components/pages/ImportPage.tsx:346 | rollbackLastImport | async function rollbackLastImport() | 33 |
| src/components/pages/ImportPage.tsx:380 | downloadTemplate | function downloadTemplate() | 21 |
| src/components/pages/ImportPage.tsx:402 | handleRestoreFile | async function handleRestoreFile(file: File) | 5 |
| src/components/pages/ImportPage.tsx:408 | confirmRestore | async function confirmRestore() | 123 |
| src/components/pages/ImportPage.tsx:432 | bulk | async function bulk<T extends | 70 |
| src/components/pages/ImportPage.tsx:835 | RepairQueueGrid | function RepairQueueGrid( | 53 |
| src/components/pages/ImportPage.tsx:889 | truthy | function truthy(v: unknown): boolean | 5 |
| src/components/pages/ImportPage.tsx:895 | normalizeType | function normalizeType(raw: string): TransactionType \| null | 20 |
| src/components/pages/ImportPage.tsx:916 | normalizeDate | function normalizeDate(raw: string): string \| null | 15 |
| src/components/pages/ImportPage.tsx:932 | normalizePaymentMode | function normalizePaymentMode(raw: string): PaymentMode | 13 |
| src/components/pages/ImportPage.tsx:946 | stableSignature | function stableSignature(obj: Record<string, unknown>): string | 9 |
| src/components/pages/ImportPage.tsx:956 | sortForSignature | function sortForSignature(value: unknown): unknown | 10 |
| src/components/pages/IncomePage.tsx:3 | IncomePage | export function IncomePage() | 3 |
| src/components/pages/InvestmentsPage.tsx:43 | InvestmentsPage | export function InvestmentsPage( | 282 |
| src/components/pages/InvestmentsPage.tsx:76 | handleDelete | async function handleDelete(id: string) | 21 |
| src/components/pages/InvestmentsPage.tsx:98 | contribute | async function contribute(inv: Investment, amount: number) | 27 |
| src/components/pages/InvestmentsPage.tsx:326 | ContribDialog | function ContribDialog( | 35 |
| src/components/pages/InvestmentsPage.tsx:362 | InvestmentForm | function InvestmentForm( | 181 |
| src/components/pages/InvestmentsPage.tsx:406 | submit | async function submit(e: React.FormEvent) | 40 |
| src/components/pages/LoansPage.tsx:67 | LoansPage | export function LoansPage() | 465 |
| src/components/pages/LoansPage.tsx:146 | handleCloseLoan | async function handleCloseLoan(l: Loan) | 14 |
| src/components/pages/LoansPage.tsx:161 | handleDelete | async function handleDelete(id: string) | 21 |
| src/components/pages/LoansPage.tsx:533 | AmortDialog | function AmortDialog( | 81 |
| src/components/pages/LoansPage.tsx:615 | LoanForm | function LoanForm( | 379 |
| src/components/pages/LoansPage.tsx:703 | submit | async function submit(e: React.FormEvent) | 54 |
| src/components/pages/ProfilePage.tsx:20 | validatePin | function validatePin(pin: string) | 8 |
| src/components/pages/ProfilePage.tsx:29 | ProfilePage | export function ProfilePage() | 349 |
| src/components/pages/ProfilePage.tsx:61 | saveProfile | async function saveProfile() | 13 |
| src/components/pages/ProfilePage.tsx:75 | savePin | async function savePin() | 29 |
| src/components/pages/ProfilePage.tsx:105 | saveSecurityRecovery | async function saveSecurityRecovery() | 14 |
| src/components/pages/ProfilePage.tsx:120 | recoverPin | async function recoverPin() | 25 |
| src/components/pages/ProfilePage.tsx:379 | InfoRow | function InfoRow( | 8 |
| src/components/pages/ReconciliationPage.tsx:12 | ReconciliationPage | export function ReconciliationPage() | 84 |
| src/components/pages/ReportsPage.tsx:63 | ReportsPage | export function ReportsPage() | 879 |
| src/components/pages/ReportsPage.tsx:943 | KpiRow | function KpiRow( | 29 |
| src/components/pages/ReportsPage.tsx:973 | SplitBar | function SplitBar( | 35 |
| src/components/pages/ReportsPage.tsx:1009 | RatioCard | function RatioCard( | 27 |
| src/components/pages/SettingsPage.tsx:51 | SettingsPage | export function SettingsPage() | 514 |
| src/components/pages/SettingsPage.tsx:75 | save | async function save() | 42 |
| src/components/pages/SettingsPage.tsx:118 | defaultSettingsPayload | function defaultSettingsPayload(): Partial<ProfileSettings> | 19 |
| src/components/pages/SettingsPage.tsx:138 | resetDemo | async function resetDemo() | 8 |
| src/components/pages/SettingsPage.tsx:147 | wipeAll | async function wipeAll() | 32 |
| src/components/pages/SubscriptionPage.tsx:14 | SubscriptionPage | export function SubscriptionPage() | 94 |
| src/components/pages/SubscriptionPage.tsx:25 | ensureRazorpayScript | async function ensureRazorpayScript() | 10 |
| src/components/pages/SubscriptionPage.tsx:36 | buyPlan | async function buyPlan(planId: number) | 43 |
| src/components/pages/SubscriptionPage.tsx:61 | handler | handler: async (resp: Record<string, string>) => | 10 |
| src/components/pages/SuggestionsPage.tsx:66 | severityOrder | function severityOrder(s: AiSuggestionSeverity): number | 12 |
| src/components/pages/SuggestionsPage.tsx:79 | activeSuggestion | function activeSuggestion(s: AiSuggestion, now: Date): boolean | 8 |
| src/components/pages/SuggestionsPage.tsx:88 | historySuggestion | function historySuggestion(s: AiSuggestion): boolean | 11 |
| src/components/pages/SuggestionsPage.tsx:100 | bucketForActive | function bucketForActive(s: AiSuggestion): SectionKey | 17 |
| src/components/pages/SuggestionsPage.tsx:118 | typeBadge | function typeBadge(t: AiSuggestionType): string | 3 |
| src/components/pages/SuggestionsPage.tsx:122 | SuggestionsPage | export function SuggestionsPage() | 256 |
| src/components/pages/SuggestionsPage.tsx:248 | patchStatus | async function patchStatus(s: AiSuggestion, status: AiSuggestion["status"], remindAt?: string \| null) | 9 |
| src/components/pages/SuggestionsPage.tsx:258 | markViewed | async function markViewed(s: AiSuggestion) | 7 |
| src/components/pages/SuggestionsPage.tsx:266 | runAi | async function runAi(s: AiSuggestion) | 25 |
| src/components/pages/SuggestionsPage.tsx:379 | PersonaCoachPanel | function PersonaCoachPanel( | 77 |
| src/components/pages/SuggestionsPage.tsx:457 | CoachMiniCard | function CoachMiniCard( | 29 |
| src/components/pages/SuggestionsPage.tsx:487 | SuggestionCard | function SuggestionCard( | 110 |
| src/components/pages/TransactionsPage.tsx:48 | TransactionsPage | export function TransactionsPage( | 539 |
| src/components/pages/TransactionsPage.tsx:150 | handleDelete | async function handleDelete(id: string) | 13 |
| src/components/pages/TransactionsPage.tsx:164 | handleDuplicate | async function handleDuplicate(t: Transaction) | 20 |
| src/components/pages/TransactionsPage.tsx:185 | bulkDelete | async function bulkDelete() | 17 |
| src/components/pages/TransactionsPage.tsx:203 | resetFilters | function resetFilters() | 9 |
| src/components/pages/UdhariPage.tsx:54 | ageingShort | function ageingShort(labels: | 20 |
| src/components/pages/UdhariPage.tsx:75 | UdhariPage | export function UdhariPage() | 592 |
| src/components/pages/UdhariPage.tsx:137 | handleDelete | async function handleDelete(id: string) | 21 |
| src/components/pages/UdhariPage.tsx:159 | settle | async function settle(u: UdhariRecord, amtRupee: number, accountId: string) | 53 |
| src/components/pages/UdhariPage.tsx:213 | recordWriteOff | async function recordWriteOff(u: UdhariRecord, amtRupee: number, categoryId: string, reason: string) | 53 |
| src/components/pages/UdhariPage.tsx:668 | SettleDialog | function SettleDialog( | 83 |
| src/components/pages/UdhariPage.tsx:752 | WriteOffDialog | function WriteOffDialog( | 76 |
| src/components/pages/UdhariPage.tsx:829 | UdhariForm | function UdhariForm( | 195 |
| src/components/pages/UdhariPage.tsx:875 | submit | async function submit(e: React.FormEvent) | 35 |
| src/components/pages/WealthHubPage.tsx:28 | localToday | function localToday(): string | 7 |
| src/components/pages/WealthHubPage.tsx:36 | WealthHubPage | export function WealthHubPage() | 293 |
| src/components/pages/WealthHubPage.tsx:58 | reload | async function reload() | 15 |
| src/components/pages/WealthHubPage.tsx:78 | addFd | async function addFd() | 34 |
| src/components/pages/WealthHubPage.tsx:113 | addInsurance | async function addInsurance() | 31 |
| src/components/pages/WealthHubPage.tsx:145 | addValuation | async function addValuation() | 27 |
| src/components/pages/admin/AdminDashboardPage.tsx:19 | AdminDashboardPage | export function AdminDashboardPage() | 139 |
| src/components/pages/admin/AdminDashboardPage.tsx:24 | load | async function load() | 12 |
| src/components/pages/admin/BrandingSettingsPage.tsx:38 | BrandingSettingsPage | export function BrandingSettingsPage() | 161 |
| src/components/pages/admin/BrandingSettingsPage.tsx:46 | load | async function load() | 19 |
| src/components/pages/admin/BrandingSettingsPage.tsx:68 | handleSave | async function handleSave() | 13 |
| src/components/pages/admin/FeatureFlagsPage.tsx:26 | flagMeta | function flagMeta(key: string): | 6 |
| src/components/pages/admin/FeatureFlagsPage.tsx:33 | FeatureFlagsPage | export function FeatureFlagsPage() | 135 |
| src/components/pages/admin/FeatureFlagsPage.tsx:41 | load | async function load() | 12 |
| src/components/pages/admin/FeatureFlagsPage.tsx:56 | handleSave | async function handleSave() | 13 |
| src/components/pages/admin/PlanManagementPage.tsx:40 | PlanManagementPage | export function PlanManagementPage() | 250 |
| src/components/pages/admin/PlanManagementPage.tsx:49 | load | async function load() | 12 |
| src/components/pages/admin/PlanManagementPage.tsx:64 | autoCode | function autoCode(name: string) | 3 |
| src/components/pages/admin/PlanManagementPage.tsx:71 | handleSubmit | async function handleSubmit(e: React.FormEvent) | 33 |
| src/components/pages/admin/SubscriptionManagementPage.tsx:46 | StatusBadge | function StatusBadge( | 9 |
| src/components/pages/admin/SubscriptionManagementPage.tsx:56 | fmt | function fmt(dateStr: string \| null): string | 4 |
| src/components/pages/admin/SubscriptionManagementPage.tsx:61 | SubscriptionManagementPage | export function SubscriptionManagementPage() | 214 |
| src/components/pages/admin/SubscriptionManagementPage.tsx:69 | load | async function load() | 12 |
| src/components/pages/admin/SubscriptionManagementPage.tsx:84 | mutateSubscription | async function mutateSubscription(subscriptionId: number, action: "manual_extend" \| "cancel") | 17 |
| src/components/pages/admin/UserManagementPage.tsx:48 | UserManagementPage | export function UserManagementPage() | 333 |
| src/components/pages/admin/UserManagementPage.tsx:63 | loadData | async function loadData() | 13 |
| src/components/pages/admin/UserManagementPage.tsx:95 | handleToggle | async function handleToggle(userId: string) | 12 |
| src/components/pages/admin/UserManagementPage.tsx:108 | handleAssignPlan | async function handleAssignPlan(userId: string, planId: number, planCode: string) | 13 |
| src/components/pages/admin/UserManagementPage.tsx:122 | handleResetPin | async function handleResetPin() | 34 |
| src/components/providers/AppProviders.tsx:7 | AppProviders | export function AppProviders( | 26 |
| src/components/theme/ThemeProvider.tsx:16 | getSystemPref | function getSystemPref(): "light" \| "dark" | 4 |
| src/components/theme/ThemeProvider.tsx:21 | applyHtmlClass | function applyHtmlClass(resolved: "light" \| "dark") | 6 |
| src/components/theme/ThemeProvider.tsx:28 | ThemeProvider | export function ThemeProvider( | 42 |
| src/components/theme/ThemeProvider.tsx:43 | handler | handler = () => | 5 |
| src/components/theme/ThemeProvider.tsx:71 | useTheme | export function useTheme(): ThemeCtx | 5 |
| src/components/ui/Badge.tsx:40 | Badge | export function Badge( | 3 |
| src/components/ui/ConfirmDialog.tsx:13 | ConfirmHost | export function ConfirmHost() | 47 |
| src/components/ui/Dialog.tsx:66 | DialogHeader | export function DialogHeader( | 11 |
| src/components/ui/Dialog.tsx:78 | DialogFooter | export function DialogFooter( | 14 |
| src/components/ui/Label.tsx:20 | Field | export function Field( | 32 |
| src/components/ui/Progress.tsx:4 | Progress | export function Progress( | 41 |
| src/components/ui/Sheet.tsx:89 | SheetHeader | SheetHeader = ( | 3 |
| src/components/ui/Sheet.tsx:92 | SheetFooter | SheetFooter = ( | 3 |
| src/components/ui/Table.tsx:83 | EmptyState | export function EmptyState( | 28 |
| src/components/ui/Toast.tsx:6 | ToastHost | export function ToastHost() | 67 |
| src/config/syncContracts.ts:65 | contract | function contract(input: Omit<SyncContract, "schemaVersion" \| "migrationBehavior"> & Partial<Pick<SyncContract, "schemaVersion" \| "migrationBehavior">>): SyncContract | 7 |
| src/db/database.ts:266 | getDB | export function getDB(): SparowVaultDB | 10 |
| src/db/database.ts:277 | isDBReady | export function isDBReady(): boolean | 3 |
| src/exports/xlsxExporter.ts:45 | mapTransactionRow | export function mapTransactionRow( t: Transaction, ctx: | 39 |
| src/exports/xlsxExporter.ts:85 | autoWidth | function autoWidth<T extends object>(rows: T[]): XLSX.ColInfo[] | 11 |
| src/exports/xlsxExporter.ts:97 | addSheet | function addSheet<T extends object>(wb: XLSX.WorkBook, name: string, rows: T[]) | 5 |
| src/exports/xlsxExporter.ts:123 | buildCAWorkbook | export function buildCAWorkbook(ctx: ExportContext, label = "SparowVault_CA_Export") | 323 |
| src/exports/xlsxExporter.ts:447 | downloadBuffer | export function downloadBuffer( buf: ArrayBuffer \| Uint8Array, filename: string, mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ) | 15 |
| src/exports/xlsxExporter.ts:463 | exportModuleToSheet | export function exportModuleToSheet<T extends object>( moduleName: string, rows: T[], format: "xlsx" \| "csv" = "xlsx", ) | 16 |
| src/i18n/useMessages.ts:3 | useMessages | export function useMessages(): Messages | 3 |
| src/lib/apiClient.ts:6 | getBaseUrl | function getBaseUrl() | 8 |
| src/lib/apiClient.ts:15 | getCloudToken | export function getCloudToken() | 4 |
| src/lib/apiClient.ts:20 | setCloudToken | export function setCloudToken(token: string \| null) | 11 |
| src/lib/apiClient.ts:32 | clearCloudToken | export function clearCloudToken() | 3 |
| src/lib/apiClient.ts:37 | setCsrfToken | export function setCsrfToken(token: string \| null) | 9 |
| src/lib/apiClient.ts:47 | readCsrfCookie | function readCsrfCookie(): string \| null | 5 |
| src/lib/apiClient.ts:53 | readCsrfToken | function readCsrfToken(): string \| null | 10 |
| src/lib/apiClient.ts:64 | maybeCaptureCsrfFromData | function maybeCaptureCsrfFromData(data: unknown): void | 6 |
| src/lib/apiClient.ts:71 | apiRequest | export async function apiRequest<T>( path: string, init?: RequestInit & | 30 |
| src/lib/cloud/auth.ts:15 | assertCloudAuthConfigured | export function assertCloudAuthConfigured() | 5 |
| src/lib/cloud/auth.ts:21 | createPinSalt | export function createPinSalt() | 3 |
| src/lib/cloud/auth.ts:25 | hashSecret | export async function hashSecret(secret: string) | 3 |
| src/lib/cloud/auth.ts:29 | verifySecret | export async function verifySecret(secret: string, hash: string) | 3 |
| src/lib/cloud/auth.ts:33 | signCloudToken | export function signCloudToken(payload: CloudJwtPayload) | 4 |
| src/lib/cloud/auth.ts:38 | verifyCloudToken | export function verifyCloudToken(token: string): CloudJwtPayload | 8 |
| src/lib/cloud/auth.ts:47 | getBearerToken | export function getBearerToken(req: Request) | 5 |
| src/lib/cloud/client.ts:5 | cloudRegister | export async function cloudRegister(input: | 14 |
| src/lib/cloud/client.ts:20 | cloudLogin | export async function cloudLogin(input: | 9 |
| src/lib/cloud/client.ts:30 | fetchPolicyVersions | export async function fetchPolicyVersions() | 6 |
| src/lib/cloud/client.ts:37 | acceptPolicies | export async function acceptPolicies(accept: Array< | 7 |
| src/lib/cloud/client.ts:45 | cloudAdminLogin | export async function cloudAdminLogin(input: | 9 |
| src/lib/cloud/client.ts:55 | cloudMe | export async function cloudMe() | 20 |
| src/lib/cloud/client.ts:76 | cloudLogout | export async function cloudLogout() | 9 |
| src/lib/cloud/client.ts:86 | cloudSyncPush | export async function cloudSyncPush(_collections: Partial<Record<CloudCollectionKey, unknown[]>>) | 13 |
| src/lib/cloud/client.ts:100 | cloudSyncPull | export async function cloudSyncPull() | 16 |
| src/lib/cloud/client.ts:117 | buildCloudCollectionsFromDataStore | export function buildCloudCollectionsFromDataStore(store: Record<string, unknown>) | 8 |
| src/lib/cloud/collections.ts:7 | isCloudCollectionKey | export function isCloudCollectionKey(value: string): value is CloudCollectionKey | 3 |
| src/lib/cloud/http.ts:4 | jsonError | export function jsonError(res: Response, message: string, status = 400) | 3 |
| src/lib/cloud/http.ts:8 | jsonOk | export function jsonOk<T>(res: Response, data: T, status = 200) | 3 |
| src/lib/cloud/http.ts:12 | requireCloudUser | export function requireCloudUser(req: Request) | 5 |
| src/lib/cloud/repoClient.ts:5 | canUseCloudRepo | export function canUseCloudRepo(collection: string): collection is CloudCollectionKey | 3 |
| src/lib/cloud/repoClient.ts:9 | pull | function pull<T>(collection: CloudCollectionKey, row: unknown): T | 3 |
| src/lib/cloud/repoClient.ts:13 | push | function push<T>(collection: CloudCollectionKey, row: unknown): T | 3 |
| src/lib/cloud/repoClient.ts:17 | cloudRepoCreate | export async function cloudRepoCreate<T extends | 14 |
| src/lib/cloud/repoClient.ts:32 | cloudRepoGet | export async function cloudRepoGet<T>(collection: CloudCollectionKey, id: string) | 7 |
| src/lib/cloud/repoClient.ts:40 | cloudRepoList | export async function cloudRepoList<T>(collection: CloudCollectionKey, userId: string) | 10 |
| src/lib/cloud/repoClient.ts:51 | cloudRepoUpdate | export async function cloudRepoUpdate<T>( collection: CloudCollectionKey, id: string, patch: Partial<T>, ) | 16 |
| src/lib/cloud/repoClient.ts:68 | cloudRepoUpdateMany | export async function cloudRepoUpdateMany<T>( collection: CloudCollectionKey, ids: string[], patch: Partial<T>, ) | 19 |
| src/lib/cloud/repoClient.ts:88 | cloudRepoSoftDelete | export async function cloudRepoSoftDelete<T>(collection: CloudCollectionKey, id: string) | 7 |
| src/lib/cloud/repoClient.ts:96 | cloudRepoHardDelete | export async function cloudRepoHardDelete(collection: CloudCollectionKey, id: string) | 9 |
| src/lib/cloud/repoClient.ts:106 | cloudRepoHardDeleteAll | export async function cloudRepoHardDeleteAll(collection: CloudCollectionKey, userId: string) | 6 |
| src/lib/cloud/repoClient.ts:113 | cloudRepoSoftDeleteMany | export async function cloudRepoSoftDeleteMany(collection: CloudCollectionKey, ids: string[]) | 10 |
| src/lib/cloud/saasClient.ts:3 | getCloudToken | export function getCloudToken() | 3 |
| src/lib/cloud/saasClient.ts:7 | fetchPublicConfig | export async function fetchPublicConfig() | 5 |
| src/lib/cloud/saasClient.ts:13 | fetchViewer | export async function fetchViewer() | 6 |
| src/lib/cloud/saasClient.ts:20 | fetchPlans | export async function fetchPlans() | 3 |
| src/lib/cloud/saasClient.ts:24 | createSubscriptionOrder | export async function createSubscriptionOrder(planId: number) | 16 |
| src/lib/cloud/saasClient.ts:41 | getMySubscription | export async function getMySubscription() | 6 |
| src/lib/cloud/saasClient.ts:48 | confirmSubscriptionPayment | export async function confirmSubscriptionPayment(payload: | 11 |
| src/lib/cloud/saasClient.ts:60 | getAdminDashboard | export async function getAdminDashboard() | 3 |
| src/lib/cloud/saasClient.ts:64 | getAdminUsers | export async function getAdminUsers() | 3 |
| src/lib/cloud/saasClient.ts:68 | getAdminPlans | export async function getAdminPlans() | 3 |
| src/lib/cloud/saasClient.ts:72 | saveAdminPlan | export async function saveAdminPlan(payload: Record<string, unknown>) | 7 |
| src/lib/cloud/saasClient.ts:80 | getAdminFeatureFlags | export async function getAdminFeatureFlags() | 3 |
| src/lib/cloud/saasClient.ts:84 | saveAdminFeatureFlags | export async function saveAdminFeatureFlags(payload: Record<string, boolean>) | 7 |
| src/lib/cloud/saasClient.ts:92 | getAdminSettings | export async function getAdminSettings() | 3 |
| src/lib/cloud/saasClient.ts:96 | saveAdminSettings | export async function saveAdminSettings(payload: Record<string, unknown>) | 7 |
| src/lib/cloud/saasClient.ts:104 | getAdminSubscriptions | export async function getAdminSubscriptions() | 3 |
| src/lib/cloud/saasClient.ts:108 | adminSubscriptionAction | export async function adminSubscriptionAction(payload: | 12 |
| src/lib/cloud/saasClient.ts:121 | assignUserPlan | export async function assignUserPlan(userId: string, planId: number) | 7 |
| src/lib/cloud/saasClient.ts:129 | toggleUserActive | export async function toggleUserActive(userId: string) | 7 |
| src/lib/cloud/saasClient.ts:138 | adminResetUserPin | export async function adminResetUserPin(userId: string, newPin: string) | 7 |
| src/lib/crypto.ts:5 | bufToHex | function bufToHex(buf: ArrayBuffer): string | 8 |
| src/lib/crypto.ts:14 | randomHex | function randomHex(bytes: number): string | 11 |
| src/lib/crypto.ts:26 | generateSalt | export function generateSalt(): string | 3 |
| src/lib/crypto.ts:30 | hashPin | export async function hashPin(pin: string, salt: string): Promise<string> | 12 |
| src/lib/crypto.ts:43 | verifyPin | export async function verifyPin(pin: string, salt: string, expectedHash: string) | 4 |
| src/lib/format.ts:6 | formatINR | export function formatINR( amount: number, options?: | 19 |
| src/lib/format.ts:26 | formatINRCompact | export function formatINRCompact(amount: number, showSymbol = true): string | 9 |
| src/lib/format.ts:36 | formatNumberIN | export function formatNumberIN(n: number, decimals = 0): string | 7 |
| src/lib/format.ts:44 | formatPercent | export function formatPercent(n: number, decimals = 1): string | 4 |
| src/lib/format.ts:49 | formatDate | export function formatDate( iso: string \| Date \| undefined \| null, pattern = "dd MMM yyyy", ): string | 9 |
| src/lib/format.ts:59 | formatDateShort | export function formatDateShort(iso: string \| Date \| undefined \| null) | 3 |
| src/lib/format.ts:63 | formatDateLong | export function formatDateLong(iso: string \| Date \| undefined \| null) | 3 |
| src/lib/format.ts:67 | formatMonthYear | export function formatMonthYear(iso: string \| Date \| undefined \| null) | 3 |
| src/lib/format.ts:71 | formatRelativeDue | export function formatRelativeDue(iso?: string \| null): string | 15 |
| src/lib/format.ts:90 | localDateToIso | export function localDateToIso(localDate: string): string | 5 |
| src/lib/format.ts:98 | isoToLocalDate | export function isoToLocalDate(iso: string \| Date \| undefined \| null): string | 6 |
| src/lib/format.ts:105 | formatPaymentMode | export function formatPaymentMode(mode: string): string | 14 |
| src/lib/format.ts:120 | formatTxType | export function formatTxType(t: string): string | 20 |
| src/lib/migrateLegacyKeys.ts:12 | migrateLegacyLocalStorageKeys | export function migrateLegacyLocalStorageKeys() | 18 |
| src/lib/navRoutes.ts:44 | navToPath | export function navToPath(nav: NavKey): string | 3 |
| src/lib/navRoutes.ts:48 | pathToNav | export function pathToNav(pathname: string): NavKey | 4 |
| src/lib/utils.ts:4 | cn | export function cn(...inputs: ClassValue[]) | 3 |
| src/lib/utils.ts:8 | uid | export function uid(prefix = "id"): string | 6 |
| src/lib/utils.ts:10 | rand | rand = () => Math.random().toString(36).slice(2, 10) | 1 |
| src/lib/utils.ts:15 | nowIso | export function nowIso(): string | 3 |
| src/lib/utils.ts:19 | sleep | export function sleep(ms: number) | 3 |
| src/lib/utils.ts:23 | clamp | export function clamp(n: number, min: number, max: number) | 3 |
| src/lib/utils.ts:27 | safeNumber | export function safeNumber(v: unknown, fallback = 0): number | 4 |
| src/lib/utils.ts:32 | range | export function range(start: number, end: number, step = 1): number[] | 7 |
| src/lib/utils.ts:40 | groupBy | export function groupBy<T, K extends string \| number>( arr: T[], keyFn: (x: T) => K, ): Record<K, T[]> | 12 |
| src/lib/utils.ts:53 | sumBy | export function sumBy<T>(arr: T[], valFn: (x: T) => number): number | 5 |
| src/lib/utils.ts:59 | percent | export function percent(numerator: number, denominator: number): number | 4 |
| src/lib/utils.ts:64 | isBrowser | export function isBrowser(): boolean | 3 |
| src/repositories/baseRepo.ts:44 | canRemote | private canRemote(): boolean | 3 |
| src/repositories/baseRepo.ts:48 | mirrorLocal | private async mirrorLocal(entity: T): Promise<void> | 3 |
| src/repositories/baseRepo.ts:52 | mirrorLocalList | private async mirrorLocalList(userId: ID, rows: T[]): Promise<void> | 8 |
| src/repositories/baseRepo.ts:65 | create | async create(input: CreateInput<T>): Promise<T> | 42 |
| src/repositories/baseRepo.ts:112 | createMany | async createMany(inputs: CreateInput<T>[]): Promise<T[]> | 50 |
| src/repositories/baseRepo.ts:167 | get | async get(id: ID): Promise<T \| undefined> | 8 |
| src/repositories/baseRepo.ts:176 | list | async list(userId: ID): Promise<T[]> | 9 |
| src/repositories/baseRepo.ts:186 | listIncludingDeleted | async listIncludingDeleted(userId: ID): Promise<T[]> | 3 |
| src/repositories/baseRepo.ts:194 | update | async update(id: ID, patch: Partial<T>): Promise<T \| undefined> | 49 |
| src/repositories/baseRepo.ts:244 | updateMany | async updateMany(ids: ID[], patch: Partial<T>): Promise<T[]> | 17 |
| src/repositories/baseRepo.ts:266 | softDelete | async softDelete(id: ID): Promise<void> | 31 |
| src/repositories/baseRepo.ts:298 | softDeleteMany | async softDeleteMany(ids: ID[]): Promise<void> | 6 |
| src/repositories/baseRepo.ts:305 | restore | async restore(id: ID): Promise<void> | 3 |
| src/repositories/baseRepo.ts:309 | hardDelete | async hardDelete(id: ID): Promise<void> | 6 |
| src/repositories/baseRepo.ts:316 | hardDeleteAllForUser | async hardDeleteAllForUser(userId: ID): Promise<void> | 7 |
| src/repositories/baseRepo.ts:328 | count | async count(userId: ID): Promise<number> | 4 |
| src/services/accountBalanceEngine.ts:9 | isCashInflow | function isCashInflow(t: Transaction): boolean | 5 |
| src/services/accountBalanceEngine.ts:15 | isCashOutflow | function isCashOutflow(t: Transaction): boolean | 12 |
| src/services/accountBalanceEngine.ts:48 | emptyBreakdown | function emptyBreakdown(accountId: string, openingPaise: number): AccountBalanceBreakdown | 21 |
| src/services/accountBalanceEngine.ts:73 | computeAccountCashClosingPaise | export function computeAccountCashClosingPaise( accountId: string, openingBalancePaise: number, txs: Transaction[], ): number | 8 |
| src/services/accountBalanceEngine.ts:85 | computeAccountBalanceBreakdown | export function computeAccountBalanceBreakdown( accountId: string, openingBalancePaise: number, txs: Transaction[], ): AccountBalanceBreakdown | 47 |
| src/services/adaptiveModeEngine.ts:19 | recommendAdaptiveMode | export function recommendAdaptiveMode(signals: AdaptiveModeSignals): | 37 |
| src/services/adaptiveModeEngine.ts:58 | calculateFreeCashUntilIncome | export function calculateFreeCashUntilIncome(input: | 21 |
| src/services/alertPriority.ts:6 | alertPriorityFromSeverity | export function alertPriorityFromSeverity( severity: "info" \| "warning" \| "danger" \| "success", kind?: string, ): AlertPriorityRank | 18 |
| src/services/alertsEngine.ts:28 | recurringRuleAmountPaise | function recurringRuleAmountPaise(r: RecurringRule): number | 4 |
| src/services/alertsEngine.ts:34 | runAlertEngine | export async function runAlertEngine(user: User) | 459 |
| src/services/alertsEngine.ts:494 | sameMonth | function sameMonth(aIso: string, bIso: string): boolean | 5 |
| src/services/authService.ts:16 | getLocalSession | export function getLocalSession(): LocalSession \| null | 10 |
| src/services/authService.ts:27 | setLocalSession | export function setLocalSession(session: LocalSession \| null) | 9 |
| src/services/authService.ts:37 | getLastUserId | export function getLastUserId(): string \| null | 4 |
| src/services/authService.ts:42 | listProfiles | export async function listProfiles(): Promise<User[]> | 23 |
| src/services/authService.ts:66 | loginProfile | export async function loginProfile( userId: string, pin: string, ): Promise<User> | 29 |
| src/services/authService.ts:96 | logoutProfile | export async function logoutProfile(userId: string) | 12 |
| src/services/authService.ts:109 | lockSession | export async function lockSession(userId: string) | 16 |
| src/services/authService.ts:126 | unlockSession | export async function unlockSession(userId: string, pin: string) | 23 |
| src/services/authService.ts:150 | changePin | export async function changePin( _userId: string, oldPin: string, newPin: string, ) | 11 |
| src/services/authService.ts:162 | setSecurityAnswer | export async function setSecurityAnswer( _userId: string, securityQuestion: string, securityAnswer: string, ) | 14 |
| src/services/authService.ts:177 | resetPinWithSecurityAnswer | export async function resetPinWithSecurityAnswer( _userId: string, securityAnswer: string, newPin: string, ) | 14 |
| src/services/authService.ts:192 | updateUserProfile | export async function updateUserProfile( _userId: string, patch: Partial<User>, ) | 16 |
| src/services/businessPersonalSplit.ts:33 | splitTransaction | export function splitTransaction(tx: Transaction): SplitParts | 42 |
| src/services/businessPersonalSplit.ts:79 | sumSplit | export function sumSplit(txs: Transaction[]): SplitParts | 11 |
| src/services/caReports.ts:55 | isLive | isLive = <T extends | 1 |
| src/services/caReports.ts:57 | cardDisplayName | function cardDisplayName(card: Card): string | 3 |
| src/services/caReports.ts:100 | reportTransactionMaster | export function reportTransactionMaster(ctx: ReportContext): TransactionMasterRow[] | 61 |
| src/services/caReports.ts:172 | reportMonthlyCashflow | export function reportMonthlyCashflow(ctx: ReportContext): MonthlyCashflowRow[] | 22 |
| src/services/caReports.ts:205 | reportCategoryLedger | export function reportCategoryLedger(ctx: ReportContext): CategoryLedgerRow[] | 18 |
| src/services/caReports.ts:235 | reportAccountLedger | export function reportAccountLedger(ctx: ReportContext): AccountLedgerRow[] | 18 |
| src/services/caReports.ts:265 | reportCardLedger | export function reportCardLedger(ctx: ReportContext): CardLedgerRow[] | 18 |
| src/services/caReports.ts:293 | reportInterestPaid | export function reportInterestPaid(ctx: ReportContext): InterestPaidRow[] | 25 |
| src/services/caReports.ts:331 | reportUdhariAgeing | export function reportUdhariAgeing(ctx: ReportContext, today = new Date()): UdhariAgeingRow[] | 19 |
| src/services/caReports.ts:354 | reportBusinessExpense | export function reportBusinessExpense(ctx: ReportContext) | 10 |
| src/services/caReports.ts:365 | reportPersonalExpense | export function reportPersonalExpense(ctx: ReportContext) | 10 |
| src/services/caReports.ts:379 | reportTaxFlag | export function reportTaxFlag(ctx: ReportContext) | 10 |
| src/services/caReports.ts:393 | reportGstMissingBill | export function reportGstMissingBill(ctx: ReportContext) | 11 |
| src/services/caReports.ts:419 | reportLoanAmortization | export function reportLoanAmortization(ctx: ReportContext): LoanAmortizationRow[] | 14 |
| src/services/caReports.ts:443 | reportNetWorth | export function reportNetWorth(ctx: ReportContext): NetWorthSummary | 24 |
| src/services/caReports.ts:479 | reportDebtSummary | export function reportDebtSummary(ctx: ReportContext): DebtSummary | 23 |
| src/services/caReports.ts:511 | reportReceivablePayableSummary | export function reportReceivablePayableSummary(ctx: ReportContext): ReceivablePayableSummary | 23 |
| src/services/caReports.ts:536 | reportFinancingCostPaise | export function reportFinancingCostPaise(ctx: ReportContext): number | 8 |
| src/services/caReports.ts:564 | reportAccountReconciliation | export function reportAccountReconciliation(ctx: ReportContext): AccountReconciliationRow[] | 56 |
| src/services/caReports.ts:634 | maskUserId | export function maskUserId(userId: string): string | 4 |
| src/services/caReports.ts:639 | buildReportFooter | export function buildReportFooter(input: | 19 |
| src/services/caReports.ts:659 | buildCAReportBundle | export function buildCAReportBundle(ctx: ReportContext, footer: CAReportFooter) | 21 |
| src/services/calculations.ts:60 | sumBy | function sumBy<T>(items: readonly T[], fn: (item: T) => number): number | 5 |
| src/services/calculations.ts:66 | percent | function percent(part: number, whole: number): number | 4 |
| src/services/calculations.ts:71 | clamp | function clamp(n: number, lo: number, hi: number): number | 3 |
| src/services/calculations.ts:87 | isIncomeTx | export function isIncomeTx(t: Transaction): boolean | 3 |
| src/services/calculations.ts:90 | isExpenseTx | export function isExpenseTx(t: Transaction): boolean | 3 |
| src/services/calculations.ts:93 | isCashOutflow | export function isCashOutflow(t: Transaction): boolean | 12 |
| src/services/calculations.ts:105 | isCashInflow | export function isCashInflow(t: Transaction): boolean | 5 |
| src/services/calculations.ts:111 | sumIncome | export function sumIncome(txs: Transaction[]): number | 3 |
| src/services/calculations.ts:115 | sumExpense | export function sumExpense(txs: Transaction[]): number | 6 |
| src/services/calculations.ts:122 | sumByType | export function sumByType(txs: Transaction[], types: TransactionType[]): number | 6 |
| src/services/calculations.ts:129 | filterByMonth | export function filterByMonth( txs: Transaction[], year: number, month: number, // 1-12 ): Transaction[] | 10 |
| src/services/calculations.ts:140 | filterByDateRange | export function filterByDateRange(txs: Transaction[], from: Date, to: Date): Transaction[] | 8 |
| src/services/calculations.ts:151 | netMonthlySavings | export function netMonthlySavings(txs: Transaction[]): number | 8 |
| src/services/calculations.ts:160 | savingsRate | export function savingsRate(netSavingsPaise: number, totalIncomePaise: number): number | 3 |
| src/services/calculations.ts:165 | budgetUsagePercent | export function budgetUsagePercent(spentPaise: number, budgetPaise: number): number | 3 |
| src/services/calculations.ts:169 | projectMonthEndSpend | export function projectMonthEndSpend(spentSoFarPaise: number, today = new Date()): number | 8 |
| src/services/calculations.ts:188 | computeGoalProgress | export function computeGoalProgress(goal: Goal, today = new Date()): GoalProgress | 32 |
| src/services/calculations.ts:224 | amortizationSchedule | export function amortizationSchedule(loan: Loan): AmortizationRow[] | 3 |
| src/services/calculations.ts:246 | summarizeLoan | export function summarizeLoan(loan: Loan, emiPayments: EMIPayment[]): LoanSummary | 52 |
| src/services/calculations.ts:308 | summarizeCardHealth | export function summarizeCardHealth( card: Card, txs: Transaction[], today = new Date(), effects: FinancialEffect[] = [], ): CardHealth | 40 |
| src/services/calculations.ts:350 | totalUdhariReceivable | export function totalUdhariReceivable(records: UdhariRecord[]): number | 6 |
| src/services/calculations.ts:356 | totalUdhariPayable | export function totalUdhariPayable(records: UdhariRecord[]): number | 6 |
| src/services/calculations.ts:364 | projectedCorpus | export function projectedCorpus( monthlyAmountPaise: number, annualReturnPct: number, months: number, ): number | 11 |
| src/services/calculations.ts:376 | emergencyMonthsCoverage | export function emergencyMonthsCoverage( totalEmergencyFundPaise: number, avgMonthlyExpensePaise: number, ): number | 7 |
| src/services/calculations.ts:407 | computeFinancialHealth | export function computeFinancialHealth(i: HealthInputs): FinancialHealthBreakdown | 41 |
| src/services/calculations.ts:450 | deriveAccountBalance | export function deriveAccountBalance( accountId: string, openingBalancePaise: number, txs: Transaction[], ): number | 7 |
| src/services/calculations.ts:458 | deriveAccountBalanceFromAccount | export function deriveAccountBalanceFromAccount( accountId: string, account: Pick<import("@/types").Account, "openingBalance" \| "openingBalancePaise">, txs: Transaction[], ): number | 7 |
| src/services/calculations.ts:475 | monthlyTrend | export function monthlyTrend( txs: Transaction[], monthsBack: number, today = new Date(), ): MonthlyBucket[] | 20 |
| src/services/calculations.ts:505 | categoryBreakdown | export function categoryBreakdown( txs: Transaction[], categories: Category[], ): CategorySlice[] | 28 |
| src/services/calculations.ts:545 | budgetStatuses | export function budgetStatuses( budgets: Budget[], txs: Transaction[], today = new Date(), ledger?: | 54 |
| src/services/calculations.ts:601 | totalInvested | export function totalInvested(investments: Investment[]): number | 6 |
| src/services/cardEmiEngine.ts:11 | localDateKey | function localDateKey(d: Date): string | 3 |
| src/services/cardEmiEngine.ts:39 | buildCardEmiSchedule | export function buildCardEmiSchedule(input: BuildEmiScheduleInput): EmiScheduleRow[] | 50 |
| src/services/cardEmiEngine.ts:90 | scheduleToInstallmentEntities | export function scheduleToInstallmentEntities( plan: CardEmiPlan, rows: EmiScheduleRow[], ): CardEmiInstallment[] | 26 |
| src/services/cardEmiEngine.ts:117 | totalPrincipalInSchedule | export function totalPrincipalInSchedule(rows: EmiScheduleRow[]): number | 3 |
| src/services/cardEmiEngine.ts:121 | createCardEmiPlanFromPurchase | export function createCardEmiPlanFromPurchase(input: | 45 |
| src/services/cardEmiEngine.ts:168 | calculateNetFinancingCostPaise | export function calculateNetFinancingCostPaise(input: | 26 |
| src/services/cardEmiEngine.ts:196 | estimateCardEmiForeclosurePaise | export function estimateCardEmiForeclosurePaise(input: | 22 |
| src/services/cardEmiEngine.ts:220 | compareCardEmiTenures | export function compareCardEmiTenures(input: | 30 |
| src/services/cardEngine.ts:20 | filterCardLiabilityEffects | export function filterCardLiabilityEffects( effects: FinancialEffect[], cardId: string, userId?: string, ): FinancialEffect[] | 13 |
| src/services/cardEngine.ts:35 | calculateCardNetLiability | export function calculateCardNetLiability( cardId: string, effects: FinancialEffect[], userId?: string, ): number | 12 |
| src/services/cardEngine.ts:49 | calculateCardOutstanding | export function calculateCardOutstanding(cardId: string, effects: FinancialEffect[], userId?: string): number | 3 |
| src/services/cardEngine.ts:54 | calculateCardCreditBalance | export function calculateCardCreditBalance( cardId: string, effects: FinancialEffect[], userId?: string, ): number | 8 |
| src/services/cardEngine.ts:64 | calculateCardOutstandingFromTransactions | export function calculateCardOutstandingFromTransactions(card: Card, txs: Transaction[]): number | 18 |
| src/services/cardEngine.ts:83 | resolveCardOutstandingPaise | export function resolveCardOutstandingPaise( card: Card, txs: Transaction[], effects: FinancialEffect[], shadow?: UserCreditCardShadow \| null, ): | 18 |
| src/services/cardEngine.ts:102 | calculateAvailableLimit | export function calculateAvailableLimit(card: Card, outstandingPaise: number): number | 4 |
| src/services/cardEngine.ts:111 | calculateSharedLimitAvailablePaise | export function calculateSharedLimitAvailablePaise(input: | 7 |
| src/services/cardEngine.ts:120 | calculateUtilization | export function calculateUtilization(card: Card, outstandingPaise: number): number | 5 |
| src/services/cardEngine.ts:126 | lastStatementDateForCard | export function lastStatementDateForCard(card: Card, today: Date): Date | 8 |
| src/services/cardEngine.ts:135 | calculateStatementWindow | export function calculateStatementWindow(card: Card, today: Date): StatementWindow | 7 |
| src/services/cardEngine.ts:143 | calculateNextDueDate | export function calculateNextDueDate(card: Card, today: Date): Date \| null | 13 |
| src/services/cardEngine.ts:158 | calculateMinimumDue | export function calculateMinimumDue(statementBalancePaise: number): number | 6 |
| src/services/cardEngine.ts:165 | calculateCardRisk | export function calculateCardRisk(card: Card, outstandingPaise: number): CardRiskLevel | 9 |
| src/services/cardEngine.ts:198 | formatShort | function formatShort(d: Date): string | 3 |
| src/services/cardEngine.ts:202 | buildCreditCardIntel | export function buildCreditCardIntel( card: Card, txs: Transaction[], effects: FinancialEffect[], today = new Date(), shadow?: UserCreditCardShadow \| null, ): CreditCardIntel \| null | 95 |
| src/services/cardEngine.ts:298 | calculatePaymentToReachUtilization | export function calculatePaymentToReachUtilization( card: Card, outstandingPaise: number, targetPct: 80 \| 50 \| 30, ): number | 10 |
| src/services/cardEngine.ts:310 | findOrphanCreditCardExpenses | export function findOrphanCreditCardExpenses(txs: Transaction[], userId: string): Transaction[] | 10 |
| src/services/cardEngine.ts:334 | buildCardRepairQueue | export function buildCardRepairQueue( cards: Card[], txs: Transaction[], userId: string, ): CardRepairIssue[] | 54 |
| src/services/cardPaymentAllocator.ts:14 | allocatePaymentsToStatement | export function allocatePaymentsToStatement( statement: CardStatement, payments: Transaction[], userId: string, ): PaymentAllocationResult | 36 |
| src/services/cardStatementEngine.ts:14 | buildOpenCardStatement | export function buildOpenCardStatement( card: Card, txs: Transaction[], today = new Date(), ): CardStatement | 45 |
| src/services/cardStatementEngine.ts:60 | remainingDuePaise | export function remainingDuePaise(statement: CardStatement, extraPaymentsPaise = 0): number | 3 |
| src/services/cardStatementEngine.ts:64 | nextStatementCloseDate | export function nextStatementCloseDate(card: Card, today = new Date()): Date | 3 |
| src/services/cashflowSurvivalEngine.ts:51 | spendableAccountTypes | function spendableAccountTypes(t: Account["type"]): boolean | 14 |
| src/services/cashflowSurvivalEngine.ts:66 | nextIncomeFromRecurring | function nextIncomeFromRecurring(rules: RecurringRule[]): | 17 |
| src/services/cashflowSurvivalEngine.ts:84 | buildCashflowSurvivalReport | export function buildCashflowSurvivalReport( accounts: Account[], transactions: Transaction[], recurringRules: RecurringRule[], loans: Loan[], emis: EMIPayment[], cards: Card[], goals: Goal[], udhari: UdhariRecord[], ledgerEffects: FinancialEffect[], today = new Date(), ): CashflowSurvivalReport | 168 |
| src/services/cashflowSurvivalEngine.ts:206 | fmt | fmt = (p: number) => new Intl.NumberFormat("en-IN", | 6 |
| src/services/categoryColorEngine.ts:80 | moduleColor | export function moduleColor(module: ModuleColorKey): string | 3 |
| src/services/categoryColorEngine.ts:84 | expensePalette | export function expensePalette(accessibility: ChartAccessibility): readonly string[] | 3 |
| src/services/categoryColorEngine.ts:88 | incomePalette | export function incomePalette(accessibility: ChartAccessibility): readonly string[] | 3 |
| src/services/categoryColorEngine.ts:92 | normHex | function normHex(c: string): string | 3 |
| src/services/categoryColorEngine.ts:97 | activeCategoriesForColoring | export function activeCategoriesForColoring(categories: Category[]): Category[] | 3 |
| src/services/categoryColorEngine.ts:105 | expenseBreakdownWithDistinctChartColors | export function expenseBreakdownWithDistinctChartColors( slices: CategorySlice[], accessibility: ChartAccessibility, topN = 5, ): Array< CategorySlice & | 41 |
| src/services/categoryColorEngine.ts:147 | attachCategoryIcons | export function attachCategoryIcons( rows: Array<CategorySlice & | 11 |
| src/services/categoryColorEngine.ts:159 | hideDeletedCategorySlices | export function hideDeletedCategorySlices( slices: CategorySlice[], categories: Category[], ): CategorySlice[] | 7 |
| src/services/categoryColorEngine.ts:168 | usedColorsForAppliesTo | export function usedColorsForAppliesTo(categories: Category[], appliesTo: Category["appliesTo"]): Set<string> | 11 |
| src/services/categoryColorEngine.ts:180 | suggestNextCategoryColor | export function suggestNextCategoryColor( appliesTo: Category["appliesTo"], categories: Category[], accessibility: ChartAccessibility, ): string | 15 |
| src/services/categoryColorEngine.ts:202 | findDuplicateCategoryColors | export function findDuplicateCategoryColors(categories: Category[]): DuplicateColorGroup[] | 20 |
| src/services/categoryColorEngine.ts:229 | findDuplicateCategoryNames | export function findDuplicateCategoryNames(categories: Category[]): DuplicateNameGroup[] | 20 |
| src/services/defaultsService.ts:8 | seedDefaultCategories | export async function seedDefaultCategories(user: User) | 46 |
| src/services/defaultsService.ts:55 | seedDefaultAccounts | export async function seedDefaultAccounts(user: User) | 47 |
| src/services/demoData.ts:23 | iso | function iso(d: Date) | 3 |
| src/services/demoData.ts:27 | seedDemoData | export async function seedDemoData(user: User) | 662 |
| src/services/demoData.ts:38 | catByName | catByName = (n: string) => cats.find((c) => c.name === n) | 1 |
| src/services/emergencyFundEngine.ts:40 | isEssentialCategoryName | export function isEssentialCategoryName(name: string): boolean | 4 |
| src/services/emergencyFundEngine.ts:45 | essentialCategoryIds | function essentialCategoryIds(categories: Category[]): Set<string> | 9 |
| src/services/emergencyFundEngine.ts:56 | averageMonthlyEssentialPaise | export function averageMonthlyEssentialPaise( transactions: Transaction[], categories: Category[], today = new Date(), months = 3, ): number | 26 |
| src/services/emergencyFundEngine.ts:94 | buildEmergencyFundIntel | export function buildEmergencyFundIntel( transactions: Transaction[], categories: Category[], investments: Investment[], goals: Goal[], today = new Date(), targetMonths: number = DEFAULT_TARGET_MONTHS, ): EmergencyFundIntel | 35 |
| src/services/exportSafety.ts:22 | ownRows | function ownRows<T extends UserScopedRow>(rows: T[], userId: string): T[] | 3 |
| src/services/exportSafety.ts:45 | buildUserOwnedFullExportPayload | export function buildUserOwnedFullExportPayload( user: Pick<User, "id" \| "username" \| "displayName">, collections: FullExportCollections, exportedAt = new Date().toISOString(), ) | 33 |
| src/services/financeEventBuilder.ts:38 | txDateKey | function txDateKey(t: Transaction): string | 9 |
| src/services/financeEventBuilder.ts:48 | eff | function eff( eventId: string, userId: string, targetType: FinancialEffectTargetType, targetId: string, direction: FinancialEffectDirection, amountPaise: number, component: FinancialEffectComponent, ): FinancialEffect | 21 |
| src/services/financeEventBuilder.ts:70 | expenseEventType | function expenseEventType(pm: Transaction["paymentMode"]): FinancialEventType | 3 |
| src/services/financeEventBuilder.ts:74 | buildFinanceEventBuilderContext | export function buildFinanceEventBuilderContext( categories: Category[], emis: EMIPayment[], ): FinanceEventBuilderContext | 11 |
| src/services/financeEventBuilder.ts:87 | buildLedgerForTransaction | export function buildLedgerForTransaction( tx: Transaction, ctx: FinanceEventBuilderContext, source: FinancialEventSource = "transaction", ): LedgerTransactionBuild | 557 |
| src/services/financeEventBuilder.ts:101 | baseEvent | baseEvent = (type: FinancialEventType, status: FinancialEventStatus): FinancialEvent => ( | 16 |
| src/services/financeEventBuilder.ts:122 | pushEx | pushEx = (code: string, message: string) => | 4 |
| src/services/financeEventBuilder.ts:645 | buildFullLedger | export function buildFullLedger( userId: string, transactions: Transaction[], ctx: FinanceEventBuilderContext, source: FinancialEventSource = "transaction", ): | 18 |
| src/services/financeKpiEngine.ts:43 | calculateFinanceMonthKpis | export function calculateFinanceMonthKpis( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, fallbackTxs: Transaction[] = [], ): FinanceMonthKpis | 34 |
| src/services/financeKpiEngine.ts:78 | explainFinanceMonthKpis | export function explainFinanceMonthKpis( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, fallbackTxs: Transaction[] = [], ): FinanceMonthKpiExplain | 21 |
| src/services/financeKpiEngine.ts:101 | operatingSurplusRate | export function operatingSurplusRate(operatingSurplusPaise: number, trueIncomePaise: number): number | 4 |
| src/services/financeKpiEngine.ts:107 | calculateConsolidatedNetWorthPaise | export function calculateConsolidatedNetWorthPaise( accounts: Account[], investments: Investment[], effects: FinancialEffect[], txs: Transaction[], ): number | 26 |
| src/services/financeLedgerExplain.ts:9 | inMonth | function inMonth(isoDate: string, year: number, month1to12: number): boolean | 8 |
| src/services/financeLedgerExplain.ts:24 | explainCategorySpend | export function explainCategorySpend( categoryId: string, year: number, month1to12: number, transactions: Transaction[], events: FinancialEvent[], effects: FinancialEffect[], ): ExplainCategorySpendResult | 40 |
| src/services/financeLedgerExplain.ts:71 | explainCashflowMonth | export function explainCashflowMonth( year: number, month1to12: number, events: FinancialEvent[], effects: FinancialEffect[], ): | 31 |
| src/services/financeLedgerExplain.ts:103 | explainTransactionLedgerCoverage | export function explainTransactionLedgerCoverage( t: Transaction, events: FinancialEvent[], ): | 9 |
| src/services/financeLedgerExplain.ts:113 | sumExcludedExpenseTransactionsPaise | export function sumExcludedExpenseTransactionsPaise( excluded: ExplainCategorySpendResult["excluded"], transactions: Transaction[], ): number | 9 |
| src/services/financialChecksum.ts:23 | buildFinancialChecksum | export function buildFinancialChecksum(input: | 55 |
| src/services/financialChecksum.ts:79 | checksumsEqual | export function checksumsEqual(a: FinancialChecksum, b: FinancialChecksum): boolean | 4 |
| src/services/financialChecksum.ts:84 | sumActiveTransactionPaise | export function sumActiveTransactionPaise(txs: Transaction[]): number | 3 |
| src/services/goalEngine.ts:13 | goalPriorityTier | export function goalPriorityTier(priority: Goal["priority"]): GoalPriorityTier | 6 |
| src/services/goalEngine.ts:38 | buildGoalIntel | export function buildGoalIntel(goal: Goal, today = new Date()): GoalIntel | 53 |
| src/services/goalEngine.ts:92 | summarizeGoalsAtRisk | export function summarizeGoalsAtRisk(goals: Goal[], today = new Date(), max = 3): GoalIntel[] | 8 |
| src/services/importExportRepair.ts:107 | normalizeImportType | export function normalizeImportType(raw: unknown): TransactionType \| null | 26 |
| src/services/importExportRepair.ts:134 | normalizeImportDate | export function normalizeImportDate(raw: unknown): string \| null | 19 |
| src/services/importExportRepair.ts:154 | normalizeImportPaymentMode | export function normalizeImportPaymentMode(raw: unknown): PaymentMode \| null | 15 |
| src/services/importExportRepair.ts:170 | truthy | function truthy(raw: unknown): 0 \| 1 | 4 |
| src/services/importExportRepair.ts:175 | norm | function norm(raw: string): string | 3 |
| src/services/importExportRepair.ts:179 | getMapped | function getMapped(row: Record<string, unknown>, mapping: ImportMapping, key: ImportMappingKey): unknown | 4 |
| src/services/importExportRepair.ts:184 | buildImportPreview | export function buildImportPreview( rows: Record<string, unknown>[], mapping: ImportMapping, ctx: ImportPreviewContext, ): ImportPreview | 144 |
| src/services/importExportRepair.ts:329 | createImportBatchRecord | export function createImportBatchRecord(input: | 20 |
| src/services/importExportRepair.ts:350 | buildImportRollbackPlan | export function buildImportRollbackPlan(batch: ImportBatchRecord): ImportRollbackPlan | 9 |
| src/services/importExportRepair.ts:360 | buildDataRepairQueue | export function buildDataRepairQueue(input: LedgerDiagnosticInput): DataRepairQueue | 23 |
| src/services/issuerSchedulePrecedence.ts:20 | pickAuthoritativeScheduleAmount | export function pickAuthoritativeScheduleAmount( candidates: ScheduleAmountCandidate[], ): ScheduleAmountCandidate \| null | 10 |
| src/services/issuerSchedulePrecedence.ts:31 | scheduleSourceRank | export function scheduleSourceRank(source: ScheduleSource): number | 3 |
| src/services/issuerSchedulePrecedence.ts:38 | resolveEmiObligationPaise | export function resolveEmiObligationPaise(input: | 26 |
| src/services/ledgerCalculations.ts:9 | inMonth | function inMonth(isoDate: string, year: number, month1to12: number): boolean | 8 |
| src/services/ledgerCalculations.ts:18 | eventIdsForMonth | function eventIdsForMonth( events: FinancialEvent[], year: number, month1to12: number, ): Set<string> | 12 |
| src/services/ledgerCalculations.ts:31 | filterEffectsForMonth | function filterEffectsForMonth( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): FinancialEffect[] | 9 |
| src/services/ledgerCalculations.ts:42 | calculateExpenseView | export function calculateExpenseView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): number | 22 |
| src/services/ledgerCalculations.ts:66 | calculateIncomeView | export function calculateIncomeView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): number | 14 |
| src/services/ledgerCalculations.ts:81 | hasUsableLedger | export function hasUsableLedger( events: FinancialEvent[] = [], effects: FinancialEffect[] = [], ): boolean | 6 |
| src/services/ledgerCalculations.ts:88 | calculateLedgerMonthKpis | export function calculateLedgerMonthKpis( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): | 20 |
| src/services/ledgerCalculations.ts:110 | calculateCashflowView | export function calculateCashflowView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): | 16 |
| src/services/ledgerCalculations.ts:128 | calculateNetWorthView | export function calculateNetWorthView(effects: FinancialEffect[]): number | 23 |
| src/services/ledgerCalculations.ts:152 | calculateDebtView | export function calculateDebtView(effects: FinancialEffect[]): | 16 |
| src/services/ledgerCalculations.ts:169 | calculateReceivablesPayables | export function calculateReceivablesPayables(effects: FinancialEffect[]): | 17 |
| src/services/ledgerCalculations.ts:187 | calculateCategorySpend | export function calculateCategorySpend( events: FinancialEvent[], effects: FinancialEffect[], categoryId: string, year: number, month1to12: number, ): number | 23 |
| src/services/ledgerCalculations.ts:212 | calculateFinancingCostView | export function calculateFinancingCostView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): number | 21 |
| src/services/ledgerCalculations.ts:235 | calculateDebtPrincipalRepaidView | export function calculateDebtPrincipalRepaidView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): number | 15 |
| src/services/ledgerCalculations.ts:252 | calculateNetLiquidChangeView | export function calculateNetLiquidChangeView( events: FinancialEvent[], effects: FinancialEffect[], year: number, month1to12: number, ): number | 9 |
| src/services/ledgerDiagnostics.ts:42 | active | function active<T extends | 3 |
| src/services/ledgerDiagnostics.ts:46 | setOf | function setOf<T extends | 3 |
| src/services/ledgerDiagnostics.ts:50 | diagnoseLedgerCoverage | export function diagnoseLedgerCoverage(input: LedgerDiagnosticInput): LedgerDiagnostics | 69 |
| src/services/ledgerDiagnostics.ts:66 | targetExists | targetExists = (e: FinancialEffect): boolean => | 21 |
| src/services/ledgerDiagnostics.ts:120 | ledgerDiagnosticTotal | export function ledgerDiagnosticTotal(diagnostics: LedgerDiagnostics): number | 3 |
| src/services/loanEngine.ts:25 | loanInterestType | export function loanInterestType(loan: Pick<Loan, "interestType">): LoanInterestType | 3 |
| src/services/loanEngine.ts:29 | loanInterestMethodLabel | export function loanInterestMethodLabel(loan: Pick<Loan, "interestType">): string | 7 |
| src/services/loanEngine.ts:37 | isImportedLoanLifecycle | export function isImportedLoanLifecycle(loan: Pick<Loan, "lifecycleMode">): boolean | 4 |
| src/services/loanEngine.ts:43 | calculateEMIPaise | export function calculateEMIPaise( principalPaise: number, annualRatePercent: number, tenureMonths: number, ): number | 7 |
| src/services/loanEngine.ts:61 | remainingTenureMonthsForLoan | export function remainingTenureMonthsForLoan( loan: Pick<Loan, "lifecycleMode" \| "remainingEmis" \| "completedEmis" \| "tenureMonths">, ): number | 14 |
| src/services/loanEngine.ts:76 | openingPrincipalForSchedulePaise | export function openingPrincipalForSchedulePaise(loan: Loan): number | 5 |
| src/services/loanEngine.ts:82 | buildAmortizationSchedule | export function buildAmortizationSchedule(loan: Loan): AmortizationRow[] | 54 |
| src/services/loanEngine.ts:137 | openingPrincipalForScheduleMonthPaise | export function openingPrincipalForScheduleMonthPaise( schedule: AmortizationRow[], monthIndex: number, loanOpeningPaise: number, ): number | 9 |
| src/services/loanEngine.ts:179 | buildEmiPaymentIntelligence | export function buildEmiPaymentIntelligence( payment: EMIPayment, today = new Date(), ): EmiPaymentIntelligence | 40 |
| src/services/loanEngine.ts:223 | splitPaymentPrincipalInterest | export function splitPaymentPrincipalInterest( openingPrincipalPaise: number, paymentPaise: number, annualRatePercent: number, opts?: | 22 |
| src/services/loanEngine.ts:246 | calculatePrincipalPaid | export function calculatePrincipalPaid(emiPayments: EMIPayment[]): number | 13 |
| src/services/loanEngine.ts:260 | calculateInterestPaid | export function calculateInterestPaid(emiPayments: EMIPayment[]): number | 8 |
| src/services/loanEngine.ts:269 | calculateOutstandingPrincipal | export function calculateOutstandingPrincipal(loan: Loan, emiPayments: EMIPayment[]): number | 6 |
| src/services/loanEngine.ts:276 | sumScheduleInterestFrom | function sumScheduleInterestFrom( openingPaise: number, annualRatePercent: number, monthsLeft: number, emiPaise: number, ): number | 27 |
| src/services/loanEngine.ts:304 | calculateRemainingInterest | export function calculateRemainingInterest( loan: Loan, emiPayments: EMIPayment[], ): number | 9 |
| src/services/loanEngine.ts:314 | countPaidScheduleMonths | export function countPaidScheduleMonths( schedule: AmortizationRow[], emiPayments: EMIPayment[], ): number | 17 |
| src/services/loanEngine.ts:332 | calculateRemainingTenure | export function calculateRemainingTenure(loan: Loan, emiPayments: EMIPayment[]): number | 10 |
| src/services/loanEngine.ts:348 | calculateOverdueEMIs | export function calculateOverdueEMIs( loan: Loan, emiPayments: EMIPayment[], today = new Date(), ): OverdueEmiSummary | 23 |
| src/services/loanEngine.ts:386 | simulatePayoffMonthsAndInterest | export function simulatePayoffMonthsAndInterest( openingPaise: number, annualRatePercent: number, emiPaise: number, ): | 25 |
| src/services/loanEngine.ts:415 | calculatePrepaymentImpact | export function calculatePrepaymentImpact( loan: Loan, emiPayments: EMIPayment[], extraPrincipalPaise: number, ): PrepaymentImpactResult | 24 |
| src/services/loanEngine.ts:440 | simulatePrepaymentOptions | export function simulatePrepaymentOptions( loan: Loan, emiPayments: EMIPayment[], extraPrincipalPaise: number, ): PrepaymentSimulatorResult | 31 |
| src/services/loanEngine.ts:472 | calculateForeclosureEstimate | export function calculateForeclosureEstimate( outstandingPrincipalPaise: number, foreclosureChargePercent: number, ): number | 7 |
| src/services/loanEngine.ts:489 | calculateForeclosureBreakdown | export function calculateForeclosureBreakdown( loan: Loan, emiPayments: EMIPayment[], closureDate = new Date(), ): ForeclosureBreakdown | 24 |
| src/services/loanEngine.ts:516 | importedLoanConfidence | export function importedLoanConfidence( loan: Pick<Loan, "outstandingPrincipal" \| "outstandingPrincipalPaise" \| "emiAmountOverride" \| "emiPaise" \| "annualInterestRate" \| "emiDueDay" \| "completedEmis" \| "remainingEmis" \| "principal">, ): ImportedLoanConfidence | 12 |
| src/services/loanEngine.ts:539 | buildDebtSummary | export function buildDebtSummary( loans: Loan[], emiPayments: EMIPayment[], cards: Card[], udhari: UdhariRecord[], effects: FinancialEffect[] = [], monthlyIncomePaise?: number, ): DebtSummary | 45 |
| src/services/loanEngine.ts:585 | buildFriendlyLoanSummaryLine | export function buildFriendlyLoanSummaryLine(loan: Loan, emiPayments: EMIPayment[]): string | 27 |
| src/services/loanEngine.ts:605 | ru | ru = (p: number) => new Intl.NumberFormat("en-IN", | 4 |
| src/services/loanEngine.ts:613 | formatDueEnIn | function formatDueEnIn(iso: string): string | 8 |
| src/services/loanPaymentSync.ts:16 | pickClosestEmiRow | function pickClosestEmiRow( pool: EMIPayment[], paymentLocalIsoDate: string, ): EMIPayment \| null | 19 |
| src/services/loanPaymentSync.ts:36 | monthIndexForEmiRow | function monthIndexForEmiRow(row: EMIPayment, schedule: ReturnType<typeof buildAmortizationSchedule>): number | 6 |
| src/services/loanPaymentSync.ts:47 | syncEmiPaymentFromTransaction | export async function syncEmiPaymentFromTransaction( tx: Transaction, loan: Loan, emis: EMIPayment[], ): Promise<EMIPayment \| null> | 57 |
| src/services/obligationEngine.ts:9 | recurringRuleAmountPaise | function recurringRuleAmountPaise(r: RecurringRule): number | 4 |
| src/services/obligationEngine.ts:14 | obligationOccurrenceKey | export function obligationOccurrenceKey(sourceType: string, sourceId: string, expectedDate: string): string | 3 |
| src/services/obligationEngine.ts:18 | materializeRecurringObligations | export function materializeRecurringObligations( rules: RecurringRule[], userId: string, today = new Date(), horizonDays = 30, ): Obligation[] | 36 |
| src/services/obligationEngine.ts:55 | materializeLoanEmiObligations | export function materializeLoanEmiObligations( loans: Loan[], emis: EMIPayment[], userId: string, today = new Date(), horizonDays = 30, ): Obligation[] | 34 |
| src/services/obligationEngine.ts:90 | mergeObligationsUnique | export function mergeObligationsUnique(existing: Obligation[], incoming: Obligation[]): Obligation[] | 8 |
| src/services/obligationEngine.ts:99 | obligationsDueBefore | export function obligationsDueBefore( obligations: Obligation[], beforeDate: Date, ): Obligation[] | 6 |
| src/services/obligationEngine.ts:106 | totalDuePaise | export function totalDuePaise(obligations: Obligation[]): number | 3 |
| src/services/obligationEngine.ts:111 | obligationCalendarSummary | export function obligationCalendarSummary(obligations: Obligation[], today = new Date()) | 12 |
| src/services/personaEngine.ts:58 | activeRecord | function activeRecord<T extends | 3 |
| src/services/personaEngine.ts:62 | buildPersonaSignals | export function buildPersonaSignals(input: | 61 |
| src/services/personaEngine.ts:124 | inferPersona | export function inferPersona(signals: PersonaSignals, selectedPersona?: Persona \| "auto"): PersonaResult | 49 |
| src/services/personaEngine.ts:199 | rankTopicsForPersona | export function rankTopicsForPersona(persona: Persona): SuggestionTopic[] | 3 |
| src/services/personaEngine.ts:203 | topicForSuggestionType | export function topicForSuggestionType(type: AiSuggestionType): SuggestionTopic | 21 |
| src/services/personaEngine.ts:225 | severityRank | function severityRank(severity?: AiSuggestionSeverity): number | 6 |
| src/services/personaEngine.ts:232 | rankSuggestionsForPersona | export function rankSuggestionsForPersona< T extends | 29 |
| src/services/personaEngine.ts:294 | riskFromSeverity | function riskFromSeverity(severity?: AiSuggestionSeverity): CoachMessage["riskLevel"] | 6 |
| src/services/personaEngine.ts:301 | coachMessageFromSuggestion | function coachMessageFromSuggestion( suggestion: AiSuggestion, surface: CoachSurfaceKey, titlePrefix?: string, ): CoachMessage | 18 |
| src/services/personaEngine.ts:320 | summaryMessage | function summaryMessage(input: | 30 |
| src/services/personaEngine.ts:351 | buildPersonaCoachSurfaces | export function buildPersonaCoachSurfaces(input: | 58 |
| src/services/personaEngine.ts:430 | normalizeNumberToken | function normalizeNumberToken(value: number \| string): string | 3 |
| src/services/personaEngine.ts:434 | aiGuardrails | export function aiGuardrails(text: string, options: AiGuardrailOptions = | 20 |
| src/services/planFeatureGate.ts:40 | isFeatureUnlocked | export function isFeatureUnlocked(snapshot: UserPlanSnapshot, key: PlanFeatureKey): boolean | 5 |
| src/services/planFeatureGate.ts:53 | remainingQuota | export function remainingQuota( snapshot: UserPlanSnapshot, key: PlanFeatureKey, usedInWindow: number, ): number | 12 |
| src/services/planFeatureGate.ts:69 | lockReason | export function lockReason(snapshot: UserPlanSnapshot, key: PlanFeatureKey): string | 6 |
| src/services/planFeatureGate.ts:76 | humanLabel | export function humanLabel(key: PlanFeatureKey): string | 20 |
| src/services/reconciliationEngine.ts:9 | findOrphanTransactions | export function findOrphanTransactions(txs: Transaction[]): Transaction[] | 10 |
| src/services/reconciliationEngine.ts:30 | suggestTransferMatches | export function suggestTransferMatches(txs: Transaction[], windowDays = 2): TransferMatchSuggestion[] | 29 |
| src/services/refIntegrity.ts:9 | refsForAccount | export function refsForAccount(accountId: string): ReferenceCheck | 17 |
| src/services/refIntegrity.ts:27 | refsForCard | export function refsForCard(cardId: string): ReferenceCheck | 9 |
| src/services/refIntegrity.ts:37 | refsForLoan | export function refsForLoan(loanId: string): ReferenceCheck | 14 |
| src/services/refIntegrity.ts:52 | refsForGoal | export function refsForGoal(goalId: string): ReferenceCheck | 14 |
| src/services/refIntegrity.ts:67 | refsForInvestment | export function refsForInvestment(investmentId: string): ReferenceCheck | 14 |
| src/services/refIntegrity.ts:82 | refsForUdhari | export function refsForUdhari(udhariId: string): ReferenceCheck | 14 |
| src/services/refIntegrity.ts:97 | refsForCategory | export function refsForCategory(categoryId: string): ReferenceCheck | 14 |
| src/services/sinkingFundEngine.ts:8 | monthlyRequiredPaise | export function monthlyRequiredPaise(fund: SinkingFund, today = new Date()): number | 8 |
| src/services/sinkingFundEngine.ts:17 | sinkingFundProgressPaise | export function sinkingFundProgressPaise(savedPaise: number, targetPaise: number): number | 4 |
| src/services/smartBudgetEngine.ts:19 | recurringRuleAmountPaise | function recurringRuleAmountPaise(r: RecurringRule): number | 4 |
| src/services/smartBudgetEngine.ts:27 | isPaidRecurringThisMonth | function isPaidRecurringThisMonth( rule: RecurringRule, monthTx: Transaction[], tolerance = 0.12, ): boolean | 16 |
| src/services/smartBudgetEngine.ts:44 | fixedRecurringPaidForCategory | function fixedRecurringPaidForCategory( categoryId: string, rules: RecurringRule[], monthTx: Transaction[], today: Date, ): number | 25 |
| src/services/smartBudgetEngine.ts:70 | variableDailyAveragePaise | function variableDailyAveragePaise( txs: Transaction[], categoryId: string, from: Date, to: Date, ): number | 22 |
| src/services/smartBudgetEngine.ts:107 | smartBudgetStatuses | export function smartBudgetStatuses( budgets: Budget[], txs: Transaction[], recurringRules: RecurringRule[], today = new Date(), ): SmartBudgetStatus[] | 89 |
| src/services/suggestionAiExplain.ts:20 | numericTokens | function numericTokens(text: string): Set<string> | 7 |
| src/services/suggestionAiExplain.ts:28 | buildSuggestionAiRewriteRequest | export function buildSuggestionAiRewriteRequest(payload: ExplainSuggestionPayload): Record<string, unknown> | 11 |
| src/services/suggestionAiExplain.ts:40 | validateSuggestionAiRewrite | export function validateSuggestionAiRewrite( payload: ExplainSuggestionPayload, text: string, ): | 16 |
| src/services/suggestionAiExplain.ts:61 | explainSuggestionInSimpleLanguage | export async function explainSuggestionInSimpleLanguage( payload: ExplainSuggestionPayload, ): Promise<string \| null> | 21 |
| src/services/suggestionEngine.ts:86 | stableCalculationJson | export function stableCalculationJson(obj: Record<string, unknown>): string | 12 |
| src/services/suggestionEngine.ts:87 | sort | sort = (v: unknown): unknown => | 9 |
| src/services/suggestionEngine.ts:99 | validateSuggestionDraft | export function validateSuggestionDraft(draft: SuggestionDraft): string[] | 20 |
| src/services/suggestionEngine.ts:120 | draft | function draft(row: Omit<SuggestionDraft, "status">): SuggestionDraft | 3 |
| src/services/suggestionEngine.ts:124 | monthKey | function monthKey(d: Date): string | 3 |
| src/services/suggestionEngine.ts:128 | expiresEndOfMonthIso | function expiresEndOfMonthIso(today: Date): ISODate | 3 |
| src/services/suggestionEngine.ts:132 | categoryName | function categoryName(categories: Category[], id: string): string | 3 |
| src/services/suggestionEngine.ts:136 | median | function median(nums: number[]): number | 6 |
| src/services/suggestionEngine.ts:143 | buildSuggestionDrafts | export function buildSuggestionDrafts(input: SuggestionEngineInput): SuggestionDraft[] | 454 |
| src/services/suggestionSync.ts:14 | sameCalendarMonth | function sameCalendarMonth(iso: string, ref: Date): boolean | 4 |
| src/services/suggestionSync.ts:19 | asCalcRecord | function asCalcRecord(s: AiSuggestion): Record<string, unknown> | 5 |
| src/services/suggestionSync.ts:25 | appendSuggestionHistory | export function appendSuggestionHistory( suggestion: Pick<AiSuggestion, "historyJson">, type: AiSuggestionHistoryEvent["type"], at: Date = new Date(), detail?: string, ): AiSuggestionHistoryEvent[] | 9 |
| src/services/suggestionSync.ts:35 | historyTypeForStatus | export function historyTypeForStatus(status: AiSuggestionStatus): AiSuggestionHistoryEvent["type"] | 5 |
| src/services/suggestionSync.ts:41 | shouldSkipSuggestionDraft | export function shouldSkipSuggestionDraft(prev: AiSuggestion \| undefined, today: Date): boolean | 9 |
| src/services/suggestionSync.ts:51 | syncSuggestionsForUser | export async function syncSuggestionsForUser( userId: string, engineIn: SuggestionEngineInput, ): Promise< | 97 |
| src/services/suggestionSync.ts:149 | buildSuggestionEngineInput | export function buildSuggestionEngineInput( userId: string, slice: Pick< SuggestionEngineInput, \| "accounts" \| "cards" \| "loans" \| "emis" \| "goals" \| "budgets" \| "udhari" \| "recurringRules" \| "categories" \| "transactions" \| "ledgerEvents" \| "ledgerEffects" >, today?: Date, ): SuggestionEngineInput | 25 |
| src/services/syncOutbox.ts:21 | loadMap | function loadMap(): Map<string, SyncOutboxItem> | 16 |
| src/services/syncOutbox.ts:40 | persist | function persist(): void | 9 |
| src/services/syncOutbox.ts:50 | subscribeSyncOutbox | export function subscribeSyncOutbox(listener: Listener): () => void | 4 |
| src/services/syncOutbox.ts:55 | enqueueSyncOutbox | export function enqueueSyncOutbox(collection: string, entityId: string): SyncOutboxItem | 13 |
| src/services/syncOutbox.ts:69 | markSyncOutboxState | export function markSyncOutboxState( collection: string, entityId: string, state: SyncOutboxState, error?: string, ): void | 20 |
| src/services/syncOutbox.ts:90 | listPendingSyncOutbox | export function listPendingSyncOutbox(): SyncOutboxItem[] | 5 |
| src/services/syncOutbox.ts:96 | pendingSyncCount | export function pendingSyncCount(): number | 3 |
| src/services/syncOutbox.ts:100 | clearSyncedOutbox | export function clearSyncedOutbox(): void | 6 |
| src/services/syncOutbox.ts:108 | resetSyncOutboxForTests | export function resetSyncOutboxForTests(): void | 11 |
| src/services/transactionFormRules.ts:45 | needsCategory | function needsCategory(type: TransactionType): boolean | 3 |
| src/services/transactionFormRules.ts:49 | trimPerson | function trimPerson(s: string): boolean | 3 |
| src/services/transactionFormRules.ts:57 | getTransactionFormPhase6Errors | export function getTransactionFormPhase6Errors( state: TransactionFormRuleState, ): Record<string, string> | 133 |
| src/services/transactionFormRules.ts:191 | isTransactionFormPhase6Valid | export function isTransactionFormPhase6Valid(state: TransactionFormRuleState): boolean | 3 |
| src/services/transactionIntent.ts:45 | intentToTransactionType | export function intentToTransactionType(intent: TransactionIntent): TransactionType | 6 |
| src/services/transactionIntent.ts:52 | isOutgoingIntent | export function isOutgoingIntent(intent: TransactionIntent): intent is OutgoingIntent | 3 |
| src/services/transactionIntent.ts:56 | transactionTypeToDefaultIntent | export function transactionTypeToDefaultIntent(type: TransactionType): TransactionIntent \| null | 30 |
| src/services/transactionIntent.ts:121 | inferChannelAndInstrument | export function inferChannelAndInstrument(paymentMode: PaymentMode): | 25 |
| src/services/transactionPreview.ts:56 | accountName | function accountName(ctx: TransactionPreviewContext, id: string): string | 3 |
| src/services/transactionPreview.ts:60 | cardLabel | function cardLabel(ctx: TransactionPreviewContext, id: string): string | 4 |
| src/services/transactionPreview.ts:65 | goalTitle | function goalTitle(ctx: TransactionPreviewContext, id: string): string | 3 |
| src/services/transactionPreview.ts:69 | loanLabel | function loanLabel(ctx: TransactionPreviewContext, id: string): string | 3 |
| src/services/transactionPreview.ts:73 | invName | function invName(ctx: TransactionPreviewContext, id: string): string | 3 |
| src/services/transactionPreview.ts:77 | udhariPerson | function udhariPerson(ctx: TransactionPreviewContext, id: string): string | 3 |
| src/services/transactionPreview.ts:81 | categoryName | function categoryName(ctx: TransactionPreviewContext, id: string \| undefined): string | 4 |
| src/services/transactionPreview.ts:86 | accountBalancePreview | function accountBalancePreview( ctx: TransactionPreviewContext, accountId: string, deltaPaise: number, ): | 13 |
| src/services/transactionPreview.ts:100 | effectSummary | function effectSummary(ledger: LedgerTransactionBuild, ru: (paise: number) => string): string[] | 7 |
| src/services/transactionPreview.ts:108 | stateToDraftTransaction | export function stateToDraftTransaction( state: TransactionFormRuleState, ctx: TransactionPreviewContext, ): Transaction \| null | 40 |
| src/services/transactionPreview.ts:149 | estimateEmiSplitForPreview | export function estimateEmiSplitForPreview( emis: EMIPayment[], loanId: string, paymentPaise: number, localDate: string, ): | 39 |
| src/services/transactionPreview.ts:194 | buildTransactionPreview | export function buildTransactionPreview( state: TransactionFormRuleState, ctx: TransactionPreviewContext, ): TransactionPreviewLines \| null | 191 |
| src/services/transactionPreview.ts:204 | ru | ru = (p: number) => formatINR(paiseToRupees(p), | 1 |
| src/services/transactionPreview.ts:386 | newPreviewTransactionId | export function newPreviewTransactionId(): string | 3 |
| src/services/udhariEngine.ts:13 | udhariPersonKey | export function udhariPersonKey(personName: string, phone?: string): string | 5 |
| src/services/udhariEngine.ts:20 | opaquePhoneHash | export function opaquePhoneHash(phone: string \| undefined): string | 9 |
| src/services/udhariEngine.ts:30 | udhariRemainingPaise | export function udhariRemainingPaise(r: UdhariRecord): number | 3 |
| src/services/udhariEngine.ts:57 | bucketForEntry | function bucketForEntry(r: UdhariRecord, today: Date): UdhariAgeingBucket["label"] \| null | 13 |
| src/services/udhariEngine.ts:71 | riskFromIntel | function riskFromIntel( overdueAmt: number, recvOpen: number, borrowCount: number, ): UdhariRiskLevel | 10 |
| src/services/udhariEngine.ts:82 | buildUdhariPeopleIntel | export function buildUdhariPeopleIntel( records: UdhariRecord[], settlements: UdhariSettlement[], today = new Date(), ): UdhariPersonIntel[] | 87 |
| src/services/udhariEngine.ts:170 | buildUdhariWhatsAppReminder | export function buildUdhariWhatsAppReminder( record: UdhariRecord, outstandingPaise: number, tone: UdhariReminderTone = "polite", ): string | 25 |
| src/services/udhariEngine.ts:196 | validateWriteOffReason | export function validateWriteOffReason(reason: string): string \| null | 6 |
| src/services/udhariEngine.ts:203 | udhariSettlementTxnLabel | export function udhariSettlementTxnLabel(type: "udhari_collect" \| "udhari_repay"): string | 3 |
| src/store/authStore.ts:31 | getStoredSession | function getStoredSession(): StoredSession \| null | 10 |
| src/store/authStore.ts:42 | setStoredSession | function setStoredSession(session: StoredSession \| null): void | 8 |
| src/store/authStore.ts:51 | getUnlockGuard | function getUnlockGuard(): UnlockGuard | 10 |
| src/store/authStore.ts:62 | setUnlockGuard | function setUnlockGuard(next: UnlockGuard \| null): void | 8 |
| src/store/authStore.ts:71 | toUserShape | function toUserShape(input: | 34 |
| src/store/authStore.ts:113 | setError | setError: (e) => set( | 1 |
| src/store/authStore.ts:115 | hydrate | hydrate: async () => | 20 |
| src/store/authStore.ts:136 | refreshProfiles | refreshProfiles: async () => | 3 |
| src/store/authStore.ts:140 | login | login: async (userId, pin) => | 18 |
| src/store/authStore.ts:159 | logout | logout: async () => | 6 |
| src/store/authStore.ts:166 | lock | lock: async () => | 5 |
| src/store/authStore.ts:172 | unlock | unlock: async (pin) => | 22 |
| src/store/authStore.ts:195 | switchProfile | switchProfile: async (userId, pin) => | 4 |
| src/store/cloudAppStore.ts:17 | hydrate | hydrate: async () => | 26 |
| src/store/dataStore.ts:55 | computeLedgerSlice | function computeLedgerSlice( userId: string, transactions: Transaction[], categories: Category[], emis: EMIPayment[], ): | 10 |
| src/store/dataStore.ts:172 | loadAll | loadAll: async (user) => | 106 |
| src/store/dataStore.ts:279 | loadBootstrap | loadBootstrap: async (user) => | 31 |
| src/store/dataStore.ts:311 | ensureCollections | ensureCollections: async (keys, user) => | 21 |
| src/store/dataStore.ts:333 | clear | clear: () => | 30 |
| src/store/dataStore.ts:364 | refreshOne | refreshOne: async (collection, user) => | 77 |
| src/store/dataStore.ts:442 | upsertLocal | upsertLocal: (key, entity) => | 15 |
| src/store/dataStore.ts:458 | removeLocal | removeLocal: (key, id) => | 6 |
| src/store/dataStore.ts:465 | setSettings | setSettings: (s) => set( | 1 |
| src/store/dataStore.ts:467 | recomputeLedger | recomputeLedger: (userId: string) => | 5 |
| src/store/navStore.ts:46 | setActive | setActive: (k, source = "user") => | 12 |
| src/store/navStore.ts:58 | syncFromUrl | syncFromUrl: () => | 7 |
| src/store/uiStore.ts:15 | readLs | function readLs<T extends string>(key: string, allowed: readonly T[], fallback: T): T | 10 |
| src/store/uiStore.ts:88 | setSidebarCollapsed | setSidebarCollapsed: (c) => set( | 1 |
| src/store/uiStore.ts:89 | openQuickAdd | openQuickAdd: (mode) => set( | 1 |
| src/store/uiStore.ts:90 | closeQuickAdd | closeQuickAdd: () => set( | 1 |
| src/store/uiStore.ts:91 | setAlertsOpen | setAlertsOpen: (o) => set( | 1 |
| src/store/uiStore.ts:92 | setCommandOpen | setCommandOpen: (o) => set( | 1 |
| src/store/uiStore.ts:93 | setDashboardMode | setDashboardMode: (m) => | 8 |
| src/store/uiStore.ts:101 | setChartAccessibility | setChartAccessibility: (a) => | 8 |
| src/store/uiStore.ts:109 | setPendingTransactionFilters | setPendingTransactionFilters: (f) => set( | 1 |
| src/store/uiStore.ts:110 | consumePendingTransactionFilters | consumePendingTransactionFilters: () => | 5 |
| src/store/uiStore.ts:115 | toast | toast: (t) => | 7 |
| src/store/uiStore.ts:122 | dismissToast | dismissToast: (id) => set( | 2 |
| src/store/uiStore.ts:124 | requestConfirm | requestConfirm: (input) => new Promise<boolean>((resolve) => | 5 |
| src/store/uiStore.ts:129 | resolveConfirm | resolveConfirm: (ok) => | 6 |
| src/store/uiStore.ts:137 | confirm | export function confirm(input: Omit<ConfirmRequest, "id" \| "resolve">): Promise<boolean> | 3 |
| src/utils/money.ts:20 | assertValidPaise | export function assertValidPaise(value: unknown, field = "amountPaise"): asserts value is number | 15 |
| src/utils/money.ts:46 | normalizeMoneyInputText | function normalizeMoneyInputText(input: string \| number \| null \| undefined): string | 8 |
| src/utils/money.ts:55 | parseMoneyInputToPaise | export function parseMoneyInputToPaise( input: string \| number \| null \| undefined, options: MoneyInputOptions = | 66 |
| src/utils/money.ts:122 | safeParseMoneyInput | export function safeParseMoneyInput( input: string \| number \| null \| undefined, options: MoneyInputOptions = | 11 |
| src/utils/money.ts:134 | rupeesToPaise | export function rupeesToPaise(value: unknown): number | 7 |
| src/utils/money.ts:143 | paiseToRupees | export function paiseToRupees(paise: number): number | 4 |
| src/utils/money.ts:155 | formatMoney | export function formatMoney(paise: number, currency: "INR" = "INR"): string | 6 |
| src/utils/money.ts:162 | addMoney | export function addMoney(...parts: number[]): number | 8 |
| src/utils/money.ts:171 | subtractMoney | export function subtractMoney(a: number, b: number): number | 3 |
| src/utils/money.ts:179 | calculateEMI | export function calculateEMI( principalPaise: number, annualRate: number, tenureMonths: number, ): number | 14 |
| src/utils/money.ts:198 | paiseOrFromRupee | function paiseOrFromRupee(paiseField: unknown, rupeeField: unknown): number | 6 |
| src/utils/money.ts:205 | transactionAmountPaise | export function transactionAmountPaise(t: Pick<Transaction, "amount" \| "amountPaise">): number | 3 |
| src/utils/money.ts:209 | accountOpeningBalancePaise | export function accountOpeningBalancePaise(a: Pick<Account, "openingBalance" \| "openingBalancePaise">): number | 3 |
| src/utils/money.ts:213 | cardCreditLimitPaise | export function cardCreditLimitPaise(c: Pick<Card, "creditLimit" \| "creditLimitPaise">): number | 3 |
| src/utils/money.ts:217 | budgetLimitPaise | export function budgetLimitPaise(b: Pick<Budget, "amount" \| "limitPaise">): number | 3 |
| src/utils/money.ts:221 | loanPrincipalPaise | export function loanPrincipalPaise(l: Pick<Loan, "principal" \| "principalPaise">): number | 3 |
| src/utils/money.ts:225 | loanOutstandingPrincipalPaise | export function loanOutstandingPrincipalPaise( l: Pick<Loan, "outstandingPrincipal" \| "outstandingPrincipalPaise" \| "principal" \| "principalPaise">, ): number | 12 |
| src/utils/money.ts:238 | loanEmiPaise | export function loanEmiPaise( l: Pick< Loan, \| "emiAmountOverride" \| "emiPaise" \| "principal" \| "principalPaise" \| "annualInterestRate" \| "tenureMonths" \| "lifecycleMode" \| "remainingEmis" \| "completedEmis" >, ): number | 35 |
| src/utils/money.ts:274 | emiPaymentAmountPaise | export function emiPaymentAmountPaise(p: Pick<EMIPayment, "amountDue" \| "amountPaise">): number | 3 |
| src/utils/money.ts:278 | emiPaymentPaidPaise | export function emiPaymentPaidPaise(p: Pick<EMIPayment, "amountPaid" \| "amountPaidPaise">): number | 3 |
| src/utils/money.ts:282 | emiPaymentOutstandingPaise | export function emiPaymentOutstandingPaise( p: Pick<EMIPayment, "amountDue" \| "amountPaise" \| "amountPaid" \| "amountPaidPaise">, ): number | 5 |
| src/utils/money.ts:288 | emiPaymentPrincipalPaidPaise | export function emiPaymentPrincipalPaidPaise( p: Pick<EMIPayment, "principalComponent" \| "principalComponentPaise">, ): number | 5 |
| src/utils/money.ts:294 | emiPaymentInterestPaise | export function emiPaymentInterestPaise( p: Pick<EMIPayment, "interestComponent" \| "interestComponentPaise">, ): number | 5 |
| src/utils/money.ts:300 | goalTargetPaise | export function goalTargetPaise(g: Pick<Goal, "targetAmount" \| "targetAmountPaise">): number | 3 |
| src/utils/money.ts:304 | goalSavedPaise | export function goalSavedPaise(g: Pick<Goal, "currentSaved" \| "savedAmountPaise">): number | 3 |
| src/utils/money.ts:308 | udhariAmountPaise | export function udhariAmountPaise(u: Pick<UdhariRecord, "amount" \| "amountPaise">): number | 3 |
| src/utils/money.ts:312 | udhariSettledPaise | export function udhariSettledPaise(u: Pick<UdhariRecord, "amountSettled" \| "amountSettledPaise">): number | 3 |
| src/utils/money.ts:316 | investmentMonthlyPaise | export function investmentMonthlyPaise(i: Pick<Investment, "monthlyTarget" \| "amountPaise">): number | 3 |
| src/utils/money.ts:320 | investmentTotalContributedPaise | export function investmentTotalContributedPaise( i: Pick<Investment, "totalContributed" \| "totalContributedPaise">, ): number | 5 |
| src/utils/moneyEntityNormalize.ts:12 | roundRupeeMirror | function roundRupeeMirror(paise: number): number | 3 |
| src/utils/moneyEntityNormalize.ts:17 | pullTransactions | function pullTransactions(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:23 | pushTransactions | function pushTransactions(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:32 | pullAccounts | function pullAccounts(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:38 | pushAccounts | function pushAccounts(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:47 | pullCards | function pullCards(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:53 | pushCards | function pushCards(row: Record<string, unknown>): void | 10 |
| src/utils/moneyEntityNormalize.ts:64 | pullBudgets | function pullBudgets(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:70 | pushBudgets | function pushBudgets(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:79 | pullLoans | function pullLoans(row: Record<string, unknown>): void | 11 |
| src/utils/moneyEntityNormalize.ts:91 | pushLoans | function pushLoans(row: Record<string, unknown>): void | 26 |
| src/utils/moneyEntityNormalize.ts:118 | pullEmis | function pullEmis(row: Record<string, unknown>): void | 29 |
| src/utils/moneyEntityNormalize.ts:148 | pushEmis | function pushEmis(row: Record<string, unknown>): void | 47 |
| src/utils/moneyEntityNormalize.ts:196 | pullGoals | function pullGoals(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:205 | pushGoals | function pushGoals(row: Record<string, unknown>): void | 14 |
| src/utils/moneyEntityNormalize.ts:220 | pullUdhari | function pullUdhari(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:229 | pushUdhari | function pushUdhari(row: Record<string, unknown>): void | 14 |
| src/utils/moneyEntityNormalize.ts:244 | pullUdhariSettlements | function pullUdhariSettlements(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:250 | pushUdhariSettlements | function pushUdhariSettlements(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:259 | pullInvestments | function pullInvestments(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:268 | pushInvestments | function pushInvestments(row: Record<string, unknown>): void | 14 |
| src/utils/moneyEntityNormalize.ts:283 | pullGoalContribs | function pullGoalContribs(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:289 | pushGoalContribs | function pushGoalContribs(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:298 | pullSavingsContribs | function pullSavingsContribs(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:304 | pushSavingsContribs | function pushSavingsContribs(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:313 | pullRecurring | function pullRecurring(row: Record<string, unknown>): void | 5 |
| src/utils/moneyEntityNormalize.ts:319 | pushRecurring | function pushRecurring(row: Record<string, unknown>): void | 8 |
| src/utils/moneyEntityNormalize.ts:360 | normalizeMoneyEntity | export function normalizeMoneyEntity( collection: CloudCollectionKey, row: Record<string, unknown>, direction: MoneyNormalizeDirection, ): Record<string, unknown> | 9 |
| src/utils/moneyEntityNormalize.ts:370 | normalizeMoneyEntityDeep | export function normalizeMoneyEntityDeep<T extends object>( collection: CloudCollectionKey, entity: T, direction: MoneyNormalizeDirection, ): T | 9 |
| src/utils/moneyEntityNormalize.ts:381 | formatMoneyRupeeLabel | export function formatMoneyRupeeLabel(paise: number): string | 3 |
| php/config/db.php:5 | db_conn | function db_conn(): PDO | 34 |
| php/config/env.php:5 | read_env_file_value | function read_env_file_value(string $path, string $targetKey): ?string | 21 |
| php/config/env.php:25 | load_env_file | function load_env_file(string $path, bool $overrideFileLoaded = false): void | 45 |
| php/config/env.php:69 | env_value | function env_value(string $key, ?string $default = null): ?string | 9 |
| php/config/env.php:77 | db_dsn | function db_dsn(): string | 19 |
| php/controllers/account.php:32 | account_verify_pin_reentry | function account_verify_pin_reentry(array $authUser, array $body): ?array | 20 |
| php/controllers/account.php:51 | account_data_export | function account_data_export(): void | 112 |
| php/controllers/account.php:162 | account_delete | function account_delete(): void | 79 |
| php/controllers/admin.php:13 | admin_subscription_period_end_sql | function admin_subscription_period_end_sql(string $interval): string | 7 |
| php/controllers/admin.php:19 | admin_dashboard | function admin_dashboard(): void | 25 |
| php/controllers/admin.php:43 | admin_plans_list | function admin_plans_list(): void | 10 |
| php/controllers/admin.php:52 | admin_plans_upsert | function admin_plans_upsert(): void | 34 |
| php/controllers/admin.php:85 | admin_settings_get | function admin_settings_get(): void | 7 |
| php/controllers/admin.php:91 | admin_settings_put | function admin_settings_put(): void | 22 |
| php/controllers/admin.php:112 | admin_feature_flags_get | function admin_feature_flags_get(): void | 7 |
| php/controllers/admin.php:118 | admin_feature_flags_put | function admin_feature_flags_put(): void | 17 |
| php/controllers/admin.php:134 | admin_users_list | function admin_users_list(): void | 36 |
| php/controllers/admin.php:169 | admin_subscriptions_list | function admin_subscriptions_list(): void | 48 |
| php/controllers/admin.php:216 | admin_subscription_action | function admin_subscription_action(): void | 57 |
| php/controllers/admin.php:272 | admin_toggle_user_active | function admin_toggle_user_active(string $userId): void | 19 |
| php/controllers/admin.php:290 | admin_reset_user_pin | function admin_reset_user_pin(string $userId, string $newPin): void | 50 |
| php/controllers/admin.php:339 | admin_assign_plan | function admin_assign_plan(string $userId, int $planId): void | 38 |
| php/controllers/cloud.php:12 | auth_throttle_status_safe | function auth_throttle_status_safe(string $username, string $ip): array | 9 |
| php/controllers/cloud.php:20 | auth_record_failure_safe | function auth_record_failure_safe(string $username, string $ip): void | 9 |
| php/controllers/cloud.php:28 | auth_clear_failures_safe | function auth_clear_failures_safe(string $username, string $ip): void | 9 |
| php/controllers/cloud.php:36 | cloud_logout | function cloud_logout(): void | 6 |
| php/controllers/cloud.php:41 | cloud_auth_response | function cloud_auth_response(string $token, array $user, ?string $csrfToken = null): array | 15 |
| php/controllers/cloud.php:55 | cloud_register | function cloud_register(): void | 75 |
| php/controllers/cloud.php:129 | cloud_login | function cloud_login(): void | 57 |
| php/controllers/cloud.php:185 | cloud_admin_login | function cloud_admin_login(): void | 45 |
| php/controllers/cloud.php:229 | cloud_me | function cloud_me(): void | 53 |
| php/controllers/cloud.php:281 | cloud_profile_update | function cloud_profile_update(): void | 52 |
| php/controllers/cloud.php:332 | ensure_security_recovery_table | function ensure_security_recovery_table(): void | 15 |
| php/controllers/cloud.php:346 | cloud_change_pin | function cloud_change_pin(): void | 53 |
| php/controllers/cloud.php:398 | cloud_set_security_recovery | function cloud_set_security_recovery(): void | 38 |
| php/controllers/cloud.php:435 | cloud_reset_pin_with_security | function cloud_reset_pin_with_security(): void | 50 |
| php/controllers/cloud_data.php:15 | cloud_patch_denied_fields | function cloud_patch_denied_fields(): array | 5 |
| php/controllers/cloud_data.php:19 | cloud_patch_has_denied_field | function cloud_patch_has_denied_field(array $patch): ?string | 11 |
| php/controllers/cloud_data.php:29 | cloud_audit_transaction_change | function cloud_audit_transaction_change(string $userId, string $actionKey, array $before, array $after): void | 9 |
| php/controllers/cloud_data.php:37 | cloud_audit_sensitive_collection_change | function cloud_audit_sensitive_collection_change(string $userId, string $collection, string $actionKey, array $before, array $after): void | 9 |
| php/controllers/cloud_data.php:45 | cloud_sync_pull | function cloud_sync_pull(): void | 25 |
| php/controllers/cloud_data.php:69 | cloud_sync_push | function cloud_sync_push(): void | 91 |
| php/controllers/cloud_data.php:159 | cloud_entity_list | function cloud_entity_list(string $collection): void | 32 |
| php/controllers/cloud_data.php:190 | cloud_entity_create | function cloud_entity_create(string $collection): void | 106 |
| php/controllers/cloud_data.php:295 | cloud_entity_delete_bulk | function cloud_entity_delete_bulk(string $collection): void | 80 |
| php/controllers/cloud_data.php:374 | cloud_get_row | function cloud_get_row(string $authUserId, string $collection, string $entityId): ?array | 9 |
| php/controllers/cloud_data.php:382 | cloud_entity_get_one | function cloud_entity_get_one(string $collection, string $id): void | 22 |
| php/controllers/cloud_data.php:403 | cloud_entity_patch_one | function cloud_entity_patch_one(string $collection, string $id): void | 71 |
| php/controllers/cloud_data.php:473 | cloud_entity_patch_many | function cloud_entity_patch_many(string $collection): void | 75 |
| php/controllers/cloud_data.php:547 | cloud_entity_delete_one | function cloud_entity_delete_one(string $collection, string $id): void | 60 |
| php/controllers/imports.php:12 | imports_transactions_bulk | function imports_transactions_bulk(): void | 114 |
| php/controllers/payments.php:29 | razorpay_webhook | function razorpay_webhook(): void | 210 |
| php/controllers/policies.php:11 | policies_current | function policies_current(): void | 17 |
| php/controllers/policies.php:27 | policies_accept | function policies_accept(): void | 31 |
| php/controllers/public_config.php:7 | public_config_get | function public_config_get(): void | 20 |
| php/controllers/public_config.php:26 | health_check_get | function health_check_get(): void | 39 |
| php/controllers/subscriptions.php:16 | decimal_inr_to_paise | function decimal_inr_to_paise(string $amount): int | 5 |
| php/controllers/subscriptions.php:20 | user_effective_features | function user_effective_features(string $userId, ?array $subscription): array | 16 |
| php/controllers/subscriptions.php:35 | subscription_period_end_sql | function subscription_period_end_sql(string $interval): string | 7 |
| php/controllers/subscriptions.php:41 | subscription_period_days | function subscription_period_days(string $interval): int | 5 |
| php/controllers/subscriptions.php:45 | subscriptions_list_plans | function subscriptions_list_plans(): void | 21 |
| php/controllers/subscriptions.php:65 | subscriptions_create_order | function subscriptions_create_order(): void | 123 |
| php/controllers/subscriptions.php:187 | subscriptions_confirm_payment | function subscriptions_confirm_payment(): void | 55 |
| php/controllers/subscriptions.php:241 | subscriptions_my | function subscriptions_my(): void | 20 |
| php/controllers/subscriptions.php:260 | subscriptions_cancel | function subscriptions_cancel(): void | 21 |
| php/helpers/app.php:6 | app_env | function app_env(): string | 5 |
| php/helpers/app.php:10 | require_env_values | function require_env_values(array $keys, bool $strict = false): void | 22 |
| php/helpers/app.php:31 | known_bad_jwt_secret_hashes | function known_bad_jwt_secret_hashes(): array | 21 |
| php/helpers/app.php:51 | require_safe_production_secrets | function require_safe_production_secrets(): void | 23 |
| php/helpers/app.php:73 | validate_runtime_config | function validate_runtime_config(): void | 15 |
| php/helpers/app.php:87 | setting_get_map | function setting_get_map(bool $publicOnly = false): array | 23 |
| php/helpers/app.php:109 | flag_get_map | function flag_get_map(): array | 11 |
| php/helpers/audit.php:5 | actor_ip_address | function actor_ip_address(): string | 6 |
| php/helpers/audit.php:10 | actor_user_agent | function actor_user_agent(): string | 6 |
| php/helpers/audit.php:15 | audit_log_action | function audit_log_action(?string $actorUserId, string $actorRole, string $actionKey, string $entityType, string $entityId, $before, $after): void | 21 |
| php/helpers/auth.php:6 | jwt_secret | function jwt_secret(): string | 9 |
| php/helpers/auth.php:14 | jwt_expires_in_seconds | function jwt_expires_in_seconds(): int | 15 |
| php/helpers/auth.php:28 | jwt_issuer | function jwt_issuer(): string | 5 |
| php/helpers/auth.php:32 | jwt_audience | function jwt_audience(): string | 5 |
| php/helpers/auth.php:36 | base64url_encode | function base64url_encode(string $data): string | 5 |
| php/helpers/auth.php:40 | base64url_decode | function base64url_decode(string $data): string | 11 |
| php/helpers/auth.php:50 | sign_cloud_token | function sign_cloud_token(array $payload): string | 18 |
| php/helpers/auth.php:67 | verify_cloud_token | function verify_cloud_token(string $token): array | 40 |
| php/helpers/auth.php:106 | auth_cookie_secure | function auth_cookie_secure(): bool | 8 |
| php/helpers/auth.php:113 | set_auth_cookie | function set_auth_cookie(string $token): void | 11 |
| php/helpers/auth.php:123 | clear_auth_cookie | function clear_auth_cookie(): void | 11 |
| php/helpers/auth.php:133 | create_pin_salt | function create_pin_salt(): string | 5 |
| php/helpers/auth.php:137 | hash_secret | function hash_secret(string $secret): string | 5 |
| php/helpers/auth.php:141 | verify_secret | function verify_secret(string $secret, string $hash): bool | 5 |
| php/helpers/auth.php:145 | auth_pin_validation_error | function auth_pin_validation_error(string $pin): ?string | 19 |
| php/helpers/auth.php:163 | auth_valid_pin | function auth_valid_pin(string $pin): bool | 5 |
| php/helpers/auth.php:167 | require_cloud_user | function require_cloud_user(): array | 14 |
| php/helpers/auth.php:180 | db_user_by_username | function db_user_by_username(string $username): ?array | 9 |
| php/helpers/auth.php:188 | db_user_by_id | function db_user_by_id(string $id): ?array | 9 |
| php/helpers/auth.php:196 | auth_require_active_user | function auth_require_active_user(): array | 15 |
| php/helpers/auth.php:210 | auth_require_admin | function auth_require_admin(): array | 9 |
| php/helpers/auth.php:218 | user_auth_row_by_id | function user_auth_row_by_id(string $userId): ?array | 9 |
| php/helpers/auth.php:226 | login_throttle_status | function login_throttle_status(string $username, string $ipAddress): array | 16 |
| php/helpers/auth.php:241 | record_login_failure | function record_login_failure(string $username, string $ipAddress): void | 15 |
| php/helpers/auth.php:255 | clear_login_failures | function clear_login_failures(string $username, string $ipAddress): void | 6 |
| php/helpers/billing.php:12 | billing_renewal_start | function billing_renewal_start(?string $currentPeriodEndUtc): string | 8 |
| php/helpers/billing.php:19 | billing_period_end_sql | function billing_period_end_sql(string $interval, string $startUtc): string | 12 |
| php/helpers/billing.php:30 | billing_active_price_paise | function billing_active_price_paise(int $planId, string $atUtc = "now"): int | 27 |
| php/helpers/billing.php:56 | billing_user_quotas | function billing_user_quotas(string $userId): array | 33 |
| php/helpers/billing.php:88 | billing_user_has_feature | function billing_user_has_feature(string $userId, string $featureKey): bool | 14 |
| php/helpers/cloud_payload.php:15 | cloud_max_row_payload_bytes | function cloud_max_row_payload_bytes(): int | 6 |
| php/helpers/cloud_payload.php:20 | cloud_max_sync_push_body_bytes | function cloud_max_sync_push_body_bytes(): int | 6 |
| php/helpers/cloud_payload.php:25 | cloud_max_entity_json_body_bytes | function cloud_max_entity_json_body_bytes(): int | 9 |
| php/helpers/cloud_payload.php:33 | cloud_collection_allowlist | function cloud_collection_allowlist(): array | 34 |
| php/helpers/cloud_payload.php:66 | cloud_is_allowed_collection | function cloud_is_allowed_collection(string $name): bool | 5 |
| php/helpers/cloud_payload.php:70 | cloud_validate_encoded_payload_size | function cloud_validate_encoded_payload_size(string $json, ?string $context = null): void | 10 |
| php/helpers/cloud_payload.php:79 | cloud_validate_sync_push_raw_size | function cloud_validate_sync_push_raw_size(string $raw): void | 7 |
| php/helpers/cloud_payload.php:85 | cloud_assert_entity_user_id | function cloud_assert_entity_user_id(string $authUserId, array $entity): void | 9 |
| php/helpers/cloud_payload.php:93 | cloud_ccr_compute_indexed | function cloud_ccr_compute_indexed(string $collection, array $entity, string $payloadJson): array | 73 |
| php/helpers/cloud_payload.php:165 | cloud_str_id | function cloud_str_id($v): ?string | 8 |
| php/helpers/cloud_payload.php:172 | cloud_transaction_types | function cloud_transaction_types(): array | 24 |
| php/helpers/cloud_payload.php:195 | cloud_transaction_payment_modes | function cloud_transaction_payment_modes(): array | 20 |
| php/helpers/cloud_payload.php:214 | cloud_validate_transaction_payload | function cloud_validate_transaction_payload(string $authUserId, array &$entity): void | 222 |
| php/helpers/cloud_payload.php:435 | cloud_validate_entity_for_collection | function cloud_validate_entity_for_collection(string $authUserId, string $collection, array &$entity): void | 9 |
| php/helpers/cloud_payload.php:443 | cloud_ccr_indexed_column_sql | function cloud_ccr_indexed_column_sql(): string | 7 |
| php/helpers/cloud_payload.php:449 | cloud_ccr_upsert_on_duplicate_sql | function cloud_ccr_upsert_on_duplicate_sql(): string | 13 |
| php/helpers/cloud_payload.php:461 | cloud_ccr_build_upsert | function cloud_ccr_build_upsert(string $authUserId, string $collection, string $entityId, array $entity, string $updatedDateSql, ?string $deletedAtSql, string $newRowPkId): array | 40 |
| php/helpers/cloud_payload.php:500 | cloud_ccr_build_update_by_table_id | function cloud_ccr_build_update_by_table_id(array $entity, string $collection, string $updatedDateSql, ?string $deletedAtSql, string $tableRowId): array | 33 |
| php/helpers/finance_events.php:11 | fe_amount_paise | function fe_amount_paise(array $tx): int | 12 |
| php/helpers/finance_events.php:22 | fe_emis_by_transaction_id | function fe_emis_by_transaction_id(PDO $db, string $userId): array | 18 |
| php/helpers/finance_events.php:39 | fe_event_id_for_transaction | function fe_event_id_for_transaction(string $txnId): string | 6 |
| php/helpers/finance_events.php:44 | fe_clear_effects_for_event | function fe_clear_effects_for_event(PDO $db, string $eventId): void | 7 |
| php/helpers/finance_events.php:50 | fe_void_ledger_for_transaction | function fe_void_ledger_for_transaction(PDO $db, string $userId, string $txnId): void | 14 |
| php/helpers/finance_events.php:63 | fe_upsert_posted_ledger | function fe_upsert_posted_ledger( PDO $db, string $userId, string $txnId, string $eventType, string $eventDate, int $amt, string $desc, string $status, string $now, array $effects, ): void | 50 |
| php/helpers/finance_events.php:112 | fe_principal_interest_paise | function fe_principal_interest_paise(array $emi, int $totalPaise): array | 20 |
| php/helpers/finance_events.php:131 | fe_int_paise | function fe_int_paise(array $row, string $paiseField, string $legacyField): int | 14 |
| php/helpers/finance_events.php:144 | finance_events_sync_transaction | function finance_events_sync_transaction(PDO $db, string $userId, array $tx): void | 402 |
| php/helpers/finance_events.php:545 | finance_events_sync_transaction_safe | function finance_events_sync_transaction_safe(PDO $db, string $userId, array $tx): void | 7 |
| php/helpers/household_auth.php:6 | household_sensitive_collections | function household_sensitive_collections(): array | 9 |
| php/helpers/household_auth.php:14 | cloud_enforce_household_write | function cloud_enforce_household_write(PDO $db, string $authUserId, string $collection, array $entity): void | 55 |
| php/helpers/http.php:3 | json_input | function json_input(): array | 13 |
| php/helpers/http.php:15 | json_ok | function json_ok($data, int $status = 200): void | 7 |
| php/helpers/http.php:21 | json_error | function json_error(string $message, int $status = 400, ?string $code = null): void | 15 |
| php/helpers/http.php:35 | require_json_body | function require_json_body(): array | 25 |
| php/helpers/http.php:59 | get_bearer_token | function get_bearer_token(): ?string | 9 |
| php/helpers/money_paise.php:7 | cloud_money_max_abs_paise | function cloud_money_max_abs_paise(): int | 5 |
| php/helpers/money_paise.php:11 | cloud_parse_money_input_to_paise | function cloud_parse_money_input_to_paise( mixed $value, string $field = "amount", bool $allowZero = true, bool $allowRounding = true ): int | 61 |
| php/helpers/money_paise.php:71 | cloud_try_money_input_to_paise | function cloud_try_money_input_to_paise(mixed $value, string $field = "amount", bool $allowZero = true, bool $allowRounding = true): ?int | 9 |
| php/helpers/money_paise.php:79 | cloud_paise_to_rupee_amount | function cloud_paise_to_rupee_amount(int $paise): float | 5 |
| php/helpers/money_paise.php:83 | cloud_validate_integer_paise_field | function cloud_validate_integer_paise_field(array $entity, string $field): void | 21 |
| php/helpers/money_paise.php:103 | cloud_validate_money_fields | function cloud_validate_money_fields(string $collection, array $entity): void | 50 |
| php/helpers/money_paise.php:152 | cloud_entity_primary_amount_paise | function cloud_entity_primary_amount_paise(string $collection, array $entity): ?int | 68 |
| php/helpers/mutation_idempotency.php:6 | financial_mutation_table_ready | function financial_mutation_table_ready(PDO $db): bool | 37 |
| php/helpers/mutation_idempotency.php:42 | financial_mutation_lookup | function financial_mutation_lookup(PDO $db, string $userId, string $mutationId): ?array | 16 |
| php/helpers/mutation_idempotency.php:57 | financial_mutation_record | function financial_mutation_record( PDO $db, string $userId, string $mutationId, string $collection, string $entityId, string $operation = "create" ): void | 23 |
| php/helpers/observability.php:3 | request_log | function request_log(string $scope, array $extra = []): void | 14 |
| php/helpers/payments.php:5 | razorpay_key_id | function razorpay_key_id(): string | 5 |
| php/helpers/payments.php:9 | razorpay_key_secret | function razorpay_key_secret(): string | 5 |
| php/helpers/payments.php:13 | razorpay_webhook_secret | function razorpay_webhook_secret(): string | 5 |
| php/helpers/payments.php:17 | razorpay_request | function razorpay_request(string $method, string $path, array $payload = []): array | 32 |
| php/helpers/payments.php:48 | razorpay_verify_signature | function razorpay_verify_signature(string $orderId, string $paymentId, string $signature): bool | 6 |
| php/helpers/payments.php:53 | razorpay_verify_webhook_signature | function razorpay_verify_webhook_signature(string $body, string $signature): bool | 6 |
| php/helpers/policy.php:10 | policy_current_versions | function policy_current_versions(): array | 10 |
| php/helpers/policy.php:19 | policy_required_for_auth | function policy_required_for_auth(): array | 5 |
| php/helpers/policy.php:23 | policy_user_outstanding_keys | function policy_user_outstanding_keys(string $userId): array | 27 |
| php/helpers/policy.php:49 | policy_record_acceptance | function policy_record_acceptance(string $userId, string $policyKey, string $version, string $ip, string $userAgent): void | 23 |
| php/helpers/policy.php:71 | policy_mark_user_checked | function policy_mark_user_checked(string $userId): void | 9 |
| php/helpers/request_id.php:13 | ensure_request_id | function ensure_request_id(): string | 25 |
| php/helpers/request_id.php:37 | structured_log | function structured_log(string $level, string $message, array $context = []): void | 19 |
| php/helpers/security.php:22 | cors_allowed_origins | function cors_allowed_origins(): array | 10 |
| php/helpers/security.php:31 | apply_cors_headers | function apply_cors_headers(): void | 31 |
| php/helpers/security.php:61 | apply_security_headers | function apply_security_headers(): void | 17 |
| php/helpers/security.php:77 | client_ip | function client_ip(): string | 32 |
| php/helpers/security.php:108 | rate_limit_guard | function rate_limit_guard(string $bucket, int $maxHits, int $windowSeconds): void | 44 |
| php/helpers/security.php:151 | rate_limit_guard_memory | function rate_limit_guard_memory(string $bucket, int $maxHits, int $windowSeconds): void | 27 |
| php/helpers/security.php:177 | rate_limit_cleanup | function rate_limit_cleanup(int $olderThanSeconds = 3600): void | 15 |
| php/helpers/security.php:191 | csrf_token_cookie_name | function csrf_token_cookie_name(): string | 5 |
| php/helpers/security.php:195 | csrf_issue_token | function csrf_issue_token(): string | 14 |
| php/helpers/security.php:208 | csrf_read_cookie_token | function csrf_read_cookie_token(): ?string | 6 |
| php/helpers/security.php:213 | csrf_require_for_mutations | function csrf_require_for_mutations(): void | 13 |
| php/helpers/user_audit.php:15 | user_audit_log | function user_audit_log(string $userId, string $actionKey, string $entityType = "", string $entityId = "", $before = null, $after = null, string $requestId = ""): void | 26 |
| php/helpers/utils.php:3 | now_iso | function now_iso(): string | 5 |
| php/helpers/utils.php:7 | uid | function uid(string $prefix = "id"): string | 5 |
| php/helpers/utils.php:11 | encode_payload | function encode_payload($value): string | 5 |
| php/helpers/utils.php:15 | decode_payload | function decode_payload(?string $raw): array | 12 |
| php/helpers/utils.php:26 | cloud_collections | function cloud_collections(): array | 10 |
| php/helpers/utils.php:35 | is_cloud_collection | function is_cloud_collection(string $name): bool | 4 |
| php/helpers/validate.php:3 | validate_string_field | function validate_string_field(array $body, string $key, int $min, int $max, ?string $pattern = null): string | 12 |
| php/helpers/validate.php:14 | validate_enum | function validate_enum(string $value, array $allowed, string $key): string | 8 |
| php/helpers/validate.php:21 | validate_decimal_string | function validate_decimal_string(string $value, string $key): string | 9 |
| php/helpers/validator.php:3 | validate_required_fields | function validate_required_fields(array $body, array $fields): void | 9 |
| php/helpers/validator.php:11 | validate_enum_field | function validate_enum_field(array $body, string $key, array $allowed): string | 9 |
| php/helpers/validator.php:19 | validate_string_length | function validate_string_length(array $body, string $key, int $min, int $max): string | 8 |
| php/routes.php:13 | dispatch_request | function dispatch_request(): void | 357 |
| scripts/local-phase-07-report-export-certification.ts:72 | readJson | function readJson<T>(filePath: string): T | 3 |
| scripts/local-phase-07-report-export-certification.ts:102 | eventFromSql | function eventFromSql(row: Phase5SqlEvent): FinancialEvent | 16 |
| scripts/local-phase-07-report-export-certification.ts:119 | effectFromSql | function effectFromSql(row: Phase5SqlEffect, index: number): FinancialEffect | 13 |
| scripts/local-phase-07-report-export-certification.ts:133 | txFromHot | function txFromHot(row: Phase5HotRow): Transaction | 26 |
| scripts/local-phase-07-report-export-certification.ts:160 | category | function category(id: string, name: string): Category | 16 |
| scripts/local-phase-07-report-export-certification.ts:469 | sumSheet | function sumSheet(sheetName: string, col: string): number | 4 |
| scripts/local-phase-07-report-export-certification.ts:478 | check | function check(name: string, pass: boolean, evidence: unknown) | 3 |
| scripts/local-phase-07-report-export-certification.ts:482 | hasCategory | hasCategory = (categoryId: string, amountPaise: number) => categoryLedger.some((row) => row.categoryId === categoryId && row.totalExpensePaise === amountPaise) | 2 |
| scripts/local-phase-08-ai-suggestion-certification.ts:260 | tx | function tx(overrides: Partial<Transaction>): Transaction | 23 |
| scripts/local-phase-08-ai-suggestion-certification.ts:367 | match | match: (d) => d.suggestionType === "credit_card" && d.dedupeKey.startsWith("card:card-hdfc") | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:368 | match | match: (d) => d.dedupeKey === "emi:overdue:emi-overdue:2026-05" | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:369 | match | match: (d) => d.dedupeKey === "emi:partial:emi-partial:2026-05" | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:370 | match | match: (d) => d.suggestionType === "udhari" && d.dedupeKey.startsWith("udhari:udhari-rahul") | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:371 | match | match: (d) => d.suggestionType === "goal" && d.dedupeKey.startsWith("goal:goal-emergency") | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:372 | match | match: (d) => d.suggestionType === "emergency_fund" | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:373 | match | match: (d) => d.suggestionType === "budget" && d.dedupeKey.startsWith("budget:cat-food") | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:374 | match | match: (d) => d.suggestionType === "missing_bill" && d.dedupeKey === "tax:txn:tx-business-missing-bill" | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:375 | match | match: (d) => d.suggestionType === "subscription" && d.dedupeKey.startsWith("subscription:rule-streaming") | 1 |
| scripts/local-phase-08-ai-suggestion-certification.ts:376 | match | match: (d) => d.suggestionType === "cashflow" && d.dedupeKey.startsWith("cashflow:daily") | 1 |
| scripts/retention-sweeper.php:27 | start_job | function start_job(PDO $db, string $key): int | 5 |
| scripts/retention-sweeper.php:31 | finish_job | function finish_job(PDO $db, int $id, int $rows, string $status = "ok", ?string $err = null): void | 43 |
