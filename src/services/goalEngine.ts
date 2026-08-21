/**
 * Phase 10 — Goal intelligence: pace, shortfall, priority tier, projections.
 */

import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from "date-fns";
import type { Goal } from "@/types";
import { computeGoalProgress, type GoalProgress } from "@/services/calculations";
import { goalSavedPaise, goalTargetPaise } from "@/utils/money";

export type GoalPriorityTier = "critical" | "important" | "lifestyle" | "wealth";

/** Maps stored 1–5 priority to human tier (1 = highest). */
export function goalPriorityTier(priority: Goal["priority"]): GoalPriorityTier {
  if (priority <= 1) return "critical";
  if (priority === 2) return "important";
  if (priority === 3) return "lifestyle";
  return "wealth";
}

export type GoalOnTrackStatus = "ahead" | "on_track" | "behind" | "critical" | "completed";

export interface GoalIntel extends GoalProgress {
  goalId: string;
  title: string;
  status: Goal["status"];
  priorityTier: GoalPriorityTier;
  targetPaise: number;
  savedPaise: number;
  targetDate: string;
  daysLeft: number;
  weeklyRequiredPaise: number;
  dailyRequiredPaise: number;
  currentPacePaisePerMonth: number;
  shortfallPaise: number;
  onTrackStatus: GoalOnTrackStatus;
}

export function buildGoalIntel(goal: Goal, today = new Date()): GoalIntel {
  const base = computeGoalProgress(goal, today);
  const targetP = goalTargetPaise(goal);
  const savedP = goalSavedPaise(goal);
  const target = parseISO(goal.targetDate);
  const started = parseISO(goal.startedAt);

  const daysLeft = Math.max(0, differenceInCalendarDays(target, today));
  const weeksLeft = Math.max(daysLeft / 7, 1 / 7);
  const daysLeftSpend = Math.max(1, daysLeft);

  const weeklyRequiredPaise = Math.round(base.remainingPaise / weeksLeft);
  const dailyRequiredPaise = Math.round(base.remainingPaise / daysLeftSpend);

  const monthsSinceStart = Math.max(1, differenceInCalendarMonths(today, started));
  const currentPacePaisePerMonth = savedP / monthsSinceStart;

  let shortfallPaise = 0;
  if (base.projectedCompletion && base.remainingPaise > 0) {
    if (base.projectedCompletion.getTime() > target.getTime()) {
      const lateDays = differenceInCalendarDays(base.projectedCompletion, target);
      shortfallPaise = Math.round((lateDays / 30) * base.monthlyRequiredPaise);
    }
  }

  let onTrackStatus: GoalOnTrackStatus = "on_track";
  if (goal.status === "completed" || savedP >= targetP) {
    onTrackStatus = "completed";
  } else if (daysLeft === 0 && savedP < targetP) {
    onTrackStatus = "critical";
  } else if (base.onTrack && currentPacePaisePerMonth > base.monthlyRequiredPaise * 1.1) {
    onTrackStatus = "ahead";
  } else if (!base.onTrack) {
    onTrackStatus = base.remainingPaise > base.monthlyRequiredPaise * 2 ? "critical" : "behind";
  }

  return {
    ...base,
    goalId: goal.id,
    title: goal.title,
    status: goal.status,
    priorityTier: goalPriorityTier(goal.priority),
    targetPaise: targetP,
    savedPaise: savedP,
    targetDate: goal.targetDate,
    daysLeft,
    weeklyRequiredPaise,
    dailyRequiredPaise,
    currentPacePaisePerMonth,
    shortfallPaise,
    onTrackStatus,
  };
}

export function summarizeGoalsAtRisk(goals: Goal[], today = new Date(), max = 3): GoalIntel[] {
  return goals
    .filter((g) => g.status === "active")
    .map((g) => buildGoalIntel(g, today))
    .filter((g) => g.onTrackStatus === "behind" || g.onTrackStatus === "critical")
    .sort((a, b) => b.shortfallPaise - a.shortfallPaise)
    .slice(0, max);
}
