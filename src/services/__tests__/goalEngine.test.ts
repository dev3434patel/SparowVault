import { describe, expect, it } from "vitest";
import type { Goal } from "@/types";
import { buildGoalIntel, goalPriorityTier, summarizeGoalsAtRisk } from "@/services/goalEngine";

const baseEntity = {
  userId: "u1",
  isDeleted: 0 as const,
  version: 1,
  tags: [] as string[],
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    ...baseEntity,
    id: "goal-1",
    title: "Emergency buffer",
    goalType: "emergency_fund",
    targetAmount: 60_000,
    targetAmountPaise: 6_000_000,
    targetDate: "2027-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:00.000Z",
    currentSaved: 12_000,
    savedAmountPaise: 1_200_000,
    priority: 1,
    icon: "shield",
    color: "#0f766e",
    status: "active",
    ...overrides,
  };
}

describe("goalEngine", () => {
  it("calculates required savings pace for a target goal", () => {
    const intel = buildGoalIntel(goal(), new Date("2026-01-01T00:00:00.000Z"));

    expect(intel.targetPaise).toBe(6_000_000);
    expect(intel.savedPaise).toBe(1_200_000);
    expect(intel.remainingPaise).toBe(4_800_000);
    expect(intel.monthsLeft).toBe(12);
    expect(intel.monthlyRequiredPaise).toBe(400_000);
    expect(intel.weeklyRequiredPaise).toBeGreaterThan(0);
    expect(intel.dailyRequiredPaise).toBeGreaterThan(0);
  });

  it("uses only the requested MVP priority tiers", () => {
    expect(goalPriorityTier(1)).toBe("critical");
    expect(goalPriorityTier(2)).toBe("important");
    expect(goalPriorityTier(3)).toBe("lifestyle");
    expect(goalPriorityTier(4)).toBe("wealth");
    expect(goalPriorityTier(5)).toBe("wealth");
  });

  it("flags a critical goal behind schedule", () => {
    const risky = goal({
      id: "goal-risk",
      targetDate: "2026-02-01T00:00:00.000Z",
      savedAmountPaise: 100_000,
      currentSaved: 1_000,
      priority: 1,
    });

    const atRisk = summarizeGoalsAtRisk([risky], new Date("2026-01-20T00:00:00.000Z"), 5);

    expect(atRisk).toHaveLength(1);
    expect(atRisk[0].priorityTier).toBe("critical");
    expect(["behind", "critical"]).toContain(atRisk[0].onTrackStatus);
  });
});
