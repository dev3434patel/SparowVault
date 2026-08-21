import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function phpEval(code: string): string {
  return execFileSync("php", ["-d", "display_errors=0", "-d", "display_startup_errors=0", "-r", code], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

describe("Phase 3 PHP money parser", () => {
  it("rounds legacy rupee float-dust explicitly to paise", () => {
    const out = phpEval(
      'require "php/helpers/money_paise.php"; echo cloud_parse_money_input_to_paise("285.5699999999", "amount", false, true);',
    );
    expect(out).toBe("28557");
  });

  it("rejects import money with too many decimals unless rounding is enabled", () => {
    const out = phpEval(
      'require "php/helpers/money_paise.php"; try { cloud_parse_money_input_to_paise("285.5699999999", "amount", false, false); echo "bad"; } catch (Throwable $e) { echo "ok"; }',
    );
    expect(out).toBe("ok");
  });

  it("keeps amountPaise as source of truth for hot-field extraction", () => {
    const out = phpEval(
      'require "php/helpers/money_paise.php"; $row = ["amountPaise" => 28556, "amount" => "285.5699999999"]; echo cloud_entity_primary_amount_paise("transactions", $row);',
    );
    expect(out).toBe("28556");
  });

  it("extracts amount_paise for a new sync transaction row", () => {
    const out = phpEval(
      'require "php/helpers/cloud_payload.php"; $row = ["id" => "txn_phase3", "userId" => "u1", "type" => "expense", "amountPaise" => 40399, "amount" => "403.990000000000009", "date" => "2026-05-14T00:00:00.000Z", "paymentMode" => "upi", "categoryId" => "cat1", "accountId" => "acc1"]; cloud_validate_entity_for_collection("u1", "transactions", $row); echo cloud_entity_primary_amount_paise("transactions", $row);',
    );
    expect(out).toBe("40399");
  });

  it("keeps transaction form writes on amountPaise", () => {
    const out = phpEval(
      '$code = file_get_contents("src/components/forms/TransactionForm.tsx"); echo strpos($code, "amountPaise: rupeesToPaise(parse.data.amount)") !== false ? "ok" : "missing";',
    );
    expect(out).toBe("ok");
  });

  it("converts Razorpay plan amount 799 INR to 79900 paise", () => {
    const out = phpEval(
      'require "php/controllers/subscriptions.php"; echo decimal_inr_to_paise("799.00");',
    );
    expect(out).toBe("79900");
  });
});
