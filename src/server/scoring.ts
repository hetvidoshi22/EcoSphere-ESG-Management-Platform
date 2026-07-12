// =============================================================
// EcoSphere — Scoring engine (ScoreProvider fan-in)
// OWNER: Shivam (platform).
//
// Each domain module (environmental, social, governance) registers a
// ScoreProvider. The engine fans in across all registered providers,
// applies the weights from esg_config, and returns a 0..100 total.
//
// Module owners: register your provider once in registerProviders()
// below (a one-line sanctioned cross-boundary edit). Do NOT change the
// contract itself.
// =============================================================

import { socialScoreProvider } from '@/server/services/score/social'
import { governanceScoreProvider } from '@/server/services/score/governance'

export type ScorePeriod = string // "2026-07"

export interface ScoreBreakdown {
  environmental: number // 0..100
  social: number // 0..100
  governance: number // 0..100
}

export interface ScoreProvider {
  /** Which ESG pillar this provider contributes to. */
  pillar: keyof ScoreBreakdown
  /** Human-readable name for debugging/telemetry. */
  name: string
  /**
   * Return this provider's contribution for a department + period,
   * normalized to 0..100.
   */
  getScore(deptId: string, period: ScorePeriod): Promise<number>
}

const providers: ScoreProvider[] = []

/** Register a provider. Called once at module load (see registerProviders). */
export function registerProvider(provider: ScoreProvider) {
  providers.push(provider)
}

export function getRegisteredProviders(): readonly ScoreProvider[] {
  return providers
}

/**
 * Default pillar weights. The live values come from the esg_config
 * singleton; these are the fallback used when config is unavailable.
 */
const DEFAULT_WEIGHTS: ScoreBreakdown = {
  environmental: 0.4,
  social: 0.3,
  governance: 0.3,
}

/**
 * Compute a department's ESG score for a period by fanning in across all
 * registered providers for each pillar (averaged), then weighting.
 * Returns a value in 0..100.
 */
export async function getScore(
  deptId: string,
  period: ScorePeriod,
  weights: ScoreBreakdown = DEFAULT_WEIGHTS,
): Promise<{ total: number; breakdown: ScoreBreakdown }> {
  const pillars: (keyof ScoreBreakdown)[] = ['environmental', 'social', 'governance']
  const breakdown: ScoreBreakdown = { environmental: 0, social: 0, governance: 0 }

  for (const pillar of pillars) {
    const pillarProviders = providers.filter((p) => p.pillar === pillar)
    if (pillarProviders.length === 0) {
      breakdown[pillar] = 0
      continue
    }
    const scores = await Promise.all(
      pillarProviders.map((p) => p.getScore(deptId, period)),
    )
    breakdown[pillar] = scores.reduce((a, b) => a + b, 0) / scores.length
  }

  const total =
    breakdown.environmental * weights.environmental +
    breakdown.social * weights.social +
    breakdown.governance * weights.governance

  return { total: Math.round(total * 100) / 100, breakdown }
}

/**
 * Central registration point for domain ScoreProviders.
 * Sanctioned cross-boundary edit: each module owner adds ONE line here.
 *
 *   registerProvider(environmentalScoreProvider)  // Mitesh
 *   registerProvider(socialScoreProvider)         // Hetvi
 *   registerProvider(governanceScoreProvider)     // Hetvi
 */
let registered = false
export function registerProviders() {
  if (registered) return
  registered = true
  // Providers are registered here by module owners (sanctioned one-liners).
  registerProvider(socialScoreProvider) // Hetvi
  registerProvider(governanceScoreProvider) // Hetvi
}
