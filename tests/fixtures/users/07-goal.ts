import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_goal_07";

const fixture: Fixture = {
  name: "User 7 — one savings goal",
  description:
    "Wants to save ₹3 L for a Goa trip by Dec 2026. Started 2026-01-01, has saved ₹70,000 across 5 contributions.",
  user: {
    id,
    username: "fixt_goal",
    displayName: "Goal Gauri",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_sb_7",
      payload: { id: "acc_sb_7", userId: id, name: "Axis Savings", type: "bank", currentBalance: 130000 },
    },
    {
      collection: "goals",
      entityId: "goal_goa",
      payload: {
        id: "goal_goa",
        userId: id,
        name: "Goa trip Dec 2026",
        targetAmount: 300000,
        currentSaved: 70000,
        startDate: iso(2026, 1, 1),
        targetDate: iso(2026, 12, 15),
        priority: "medium",
      },
    },
    {
      collection: "goalContributions",
      entityId: "gc_1",
      payload: { id: "gc_1", userId: id, goalId: "goal_goa", amount: 15000, date: iso(2026, 1, 25) },
    },
    {
      collection: "goalContributions",
      entityId: "gc_2",
      payload: { id: "gc_2", userId: id, goalId: "goal_goa", amount: 15000, date: iso(2026, 2, 25) },
    },
    {
      collection: "goalContributions",
      entityId: "gc_3",
      payload: { id: "gc_3", userId: id, goalId: "goal_goa", amount: 15000, date: iso(2026, 3, 25) },
    },
    {
      collection: "goalContributions",
      entityId: "gc_4",
      payload: { id: "gc_4", userId: id, goalId: "goal_goa", amount: 15000, date: iso(2026, 4, 25) },
    },
    {
      collection: "goalContributions",
      entityId: "gc_5",
      payload: { id: "gc_5", userId: id, goalId: "goal_goa", amount: 10000, date: iso(2026, 5, 5) },
    },
  ],
};

export default fixture;
