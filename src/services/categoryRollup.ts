export interface RollupCategory {
  id: string;
  parentId: string | null;
}

export interface RollupTxn {
  id: string;
  categoryId?: string | null;
  amountPaise: number;
}

/** Parent totals include each descendant transaction once. */
export function categoryRollupPaise(
  categories: RollupCategory[],
  transactions: RollupTxn[],
): Map<string, number> {
  const own = new Map<string, number>();
  for (const txn of transactions) {
    if (!txn.categoryId) continue;
    own.set(txn.categoryId, (own.get(txn.categoryId) ?? 0) + txn.amountPaise);
  }
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = children.get(category.parentId) ?? [];
    list.push(category.id);
    children.set(category.parentId, list);
  }
  const totals = new Map<string, number>();
  const visit = (id: string, stack: Set<string>): number => {
    if (totals.has(id)) return totals.get(id)!;
    if (stack.has(id)) return own.get(id) ?? 0;
    stack.add(id);
    let sum = own.get(id) ?? 0;
    for (const child of children.get(id) ?? []) sum += visit(child, stack);
    stack.delete(id);
    totals.set(id, sum);
    return sum;
  };
  for (const category of categories) visit(category.id, new Set());
  return totals;
}
