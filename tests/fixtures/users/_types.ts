/**
 * PHASE 0 — Fixture shape shared by all 7 sample users.
 *
 * Each fixture exports a default `Fixture` with:
 *   - user           : the row that goes into the `users` table
 *   - rows           : domain entities that go into `cloud_collection_rows`
 *
 * The pin_hash / pin_salt placeholders below are NOT real bcrypt outputs —
 * they are inert markers so a test DB never has a working PIN for these users.
 * Tests that need authentication should mint their own bcrypt hash via the
 * PHP helpers or via the auth API.
 */

export type FixtureCollection =
  | "accounts"
  | "cards"
  | "categories"
  | "transactions"
  | "budgets"
  | "loans"
  | "emiPayments"
  | "udhari"
  | "udhariSettlements"
  | "goals"
  | "goalContributions"
  | "investments"
  | "savingsContributions"
  | "recurringRules"
  | "alerts";

export interface FixtureRow {
  collection: FixtureCollection;
  entityId: string;
  payload: Record<string, unknown>;
}

export interface FixtureUser {
  id: string;            // e.g., "fixt_cash_01"
  username: string;
  displayName: string;
  pinHashPlaceholder: string;
  pinSaltPlaceholder: string;
}

export interface Fixture {
  name: string;
  description: string;
  user: FixtureUser;
  rows: FixtureRow[];
}

// Helper to build the inert PIN markers.
export const inertPin = (id: string) => ({
  pinHashPlaceholder: `$2y$12$INERT_${id}_NOT_A_REAL_BCRYPT_HASH________________`,
  pinSaltPlaceholder: `inert-${id}-salt`,
});

// ISO date helper
export const iso = (y: number, m: number, d = 1) =>
  new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
