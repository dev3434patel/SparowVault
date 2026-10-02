import { describe, expect, it } from "vitest";
import { companyAllows } from "@/company/auth/companyCan";

describe("companyAllows", () => {
  it("denies while permissions are still loading", () => {
    expect(companyAllows("loading", [], "create_receipt")).toBe(false);
    expect(companyAllows("loading", ["create_receipt"], "create_receipt")).toBe(false);
  });

  it("denies a resolved empty permission list", () => {
    expect(companyAllows("ready", [], "view_audit")).toBe(false);
    expect(companyAllows("ready", [], undefined)).toBe(false);
  });

  it("denies when the permission load failed", () => {
    expect(companyAllows("error", ["manage_users"], "manage_users")).toBe(false);
  });

  it("allows only an explicit permission after a successful load", () => {
    expect(companyAllows("ready", ["create_journal"], "create_journal")).toBe(true);
    expect(companyAllows("ready", ["create_journal"], "reopen_period")).toBe(false);
  });
});
