import { categoryRepo, accountRepo } from "@/repositories";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/constants";
import type { User } from "@/types";

export async function seedDefaultCategories(user: User) {
  const existing = await categoryRepo.list(user.id);
  if (existing.length > 0) return existing;
  const uid = user.id;
  const created = [];
  let sort = 0;
  for (const c of DEFAULT_INCOME_CATEGORIES) {
    created.push(
      await categoryRepo.create({
        userId: uid,
        data: {
          name: c.name,
          parentId: null,
          appliesTo: "income",
          icon: c.icon,
          color: c.color,
          budgetable: 0,
          taxRelevant: 0,
          gstRelevant: 0,
          sortOrder: sort++,
          archived: 0,
        },
      }),
    );
  }
  for (const c of DEFAULT_EXPENSE_CATEGORIES) {
    created.push(
      await categoryRepo.create({
        userId: uid,
        data: {
          name: c.name,
          parentId: null,
          appliesTo: "expense",
          icon: c.icon,
          color: c.color,
          budgetable: 1,
          taxRelevant: c.taxRelevant ? 1 : 0,
          gstRelevant: c.gstRelevant ? 1 : 0,
          sortOrder: sort++,
          archived: 0,
        },
      }),
    );
  }
  return created;
}

export async function seedDefaultAccounts(user: User) {
  const existing = await accountRepo.list(user.id);
  if (existing.length > 0) return existing;
  const uid = user.id;
  const accounts = [];
  accounts.push(
    await accountRepo.create({
      userId: uid,
      data: {
        name: "Cash",
        type: "cash",
        openingBalance: 0,
        color: "#10b981",
        icon: "wallet",
        isInactive: 0,
      },
    }),
  );
  accounts.push(
    await accountRepo.create({
      userId: uid,
      data: {
        name: "Savings Bank",
        type: "savings",
        institution: "HDFC Bank",
        openingBalance: 0,
        color: "#0ea5e9",
        icon: "building-2",
        isInactive: 0,
      },
    }),
  );
  accounts.push(
    await accountRepo.create({
      userId: uid,
      data: {
        name: "UPI Wallet",
        type: "upi_wallet",
        openingBalance: 0,
        color: "#8b5cf6",
        icon: "smartphone",
        isInactive: 0,
      },
    }),
  );
  return accounts;
}
