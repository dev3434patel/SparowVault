import type { CompanyPermission } from "@/company/types";

/** Unknown and failed loads deny. An empty resolved list also denies. */
export type CompanyPermissionLoadState = "loading" | "ready" | "error";

export function companyAllows(
  state: CompanyPermissionLoadState,
  permissions: readonly CompanyPermission[],
  need: CompanyPermission | undefined,
): boolean {
  if (state !== "ready" || !need) return false;
  return permissions.includes(need);
}
