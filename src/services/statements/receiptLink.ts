export interface StatementReceiptTarget {
  transactionIds?: string[];
  matchIds?: string[];
  cardId?: string;
  importSourceId?: string | null;
}

const SAFE_ID_COUNT = 40;

/** Deep link to the imported set. An empty id list stays filtered, not the whole book. */
export function statementReceiptHref(target: "transactions" | "reconciliation" | "cards", input: StatementReceiptTarget): string {
  if (target === "transactions") {
    const ids = input.transactionIds ?? [];
    const source = input.importSourceId ?? "";
    if (source && ids.length > SAFE_ID_COUNT) {
      return `/transactions?statementSource=${encodeURIComponent(source)}`;
    }
    return `/transactions?statementTx=${encodeURIComponent(ids.join(","))}`;
  }
  if (target === "reconciliation") {
    return `/reconciliation?statementMatch=${encodeURIComponent((input.matchIds ?? []).join(","))}`;
  }
  return `/cards?statementCard=${encodeURIComponent(input.cardId ?? "")}`;
}

function splitIds(params: URLSearchParams, key: string): string[] | null {
  if (!params.has(key)) return null;
  return params.get(key)!.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
}

export function statementReceiptQuery(search: string): {
  transactionIds: string[] | null;
  matchIds: string[] | null;
  cardId: string | null;
  importSourceId: string | null;
} {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const card = params.get("statementCard");
  const source = params.get("statementSource");
  return {
    transactionIds: splitIds(params, "statementTx"),
    matchIds: splitIds(params, "statementMatch"),
    cardId: params.has("statementCard") && card ? card : null,
    importSourceId: params.has("statementSource") && source ? source : null,
  };
}
