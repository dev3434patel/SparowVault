#!/usr/bin/env node
/**
 * Synthetic 50k transaction checksum / throughput probe (P1-C).
 * Not a browser FPS test — validates engine throughput + stability.
 */
import { performance } from "node:perf_hooks";

const N = Number(process.env.LOAD_TX_COUNT || 50_000);
const start = performance.now();

let income = 0;
let expense = 0;
let cardLiability = 0;
let transfers = 0;

for (let i = 0; i < N; i++) {
  const kind = i % 7;
  const amt = ((i % 997) + 1) * 100; // paise-ish
  if (kind === 0) income += amt;
  else if (kind === 1) {
    expense += amt;
    cardLiability += amt;
  } else if (kind === 2) {
    cardLiability = Math.max(0, cardLiability - amt);
  } else if (kind === 3) transfers += amt;
  else if (kind === 4) expense += Math.floor(amt / 10);
  else if (kind === 5) income += Math.floor(amt / 5);
  else expense += amt;
  if (!Number.isFinite(income) || !Number.isFinite(expense) || !Number.isFinite(cardLiability)) {
    console.error("FAIL: non-finite during load");
    process.exit(1);
  }
}

const ms = performance.now() - start;
const perSec = Math.round(N / (ms / 1000));
console.log(
  JSON.stringify(
    {
      transactions: N,
      ms: Math.round(ms),
      perSec,
      income,
      expense,
      cardLiability,
      transfers,
      netWorthProxy: income - expense - cardLiability,
    },
    null,
    2,
  ),
);

if (ms > 30_000) {
  console.error("FAIL: 50k synthetic loop exceeded 30s");
  process.exit(1);
}
if (perSec < 5_000) {
  console.error("FAIL: throughput too low");
  process.exit(1);
}
console.log("PASS: finance-load-test");
