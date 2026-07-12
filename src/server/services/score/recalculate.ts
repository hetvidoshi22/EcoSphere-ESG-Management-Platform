// =============================================================
// Score recalculation trigger (Hetvi's Social + Governance vertical).
// Delegates to the platform ScoringEngine (Shivam's `recalculateAll`),
// which fans in across the registered providers — including the real
// SocialScoreProvider + GovernanceScoreProvider registered in
// scoring.ts. Kept as a thin wrapper so the Social/Governance services
// can trigger a recompute after an approval / resolve / acknowledge
// without importing the engine internals directly.
// =============================================================
import { recalculateAll } from '@/server/scoring'

export async function recalculateScores(period?: string) {
  return recalculateAll(period)
}
