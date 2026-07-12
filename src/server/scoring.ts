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
//
// ---------------------------------------------------------------
// PILLAR OWNERS — HOW TO REGISTER YOUR REAL PROVIDER (read this):
//   1. Implement the ScoreProvider contract below in YOUR module
//      folder (e.g. src/server/.../environmental-score-provider.ts).
//   2. In registerProviders() at the bottom of THIS file, REPLACE
//      your pillar's stub line with your real provider, e.g.:
//         registerProvider(environmentalScoreProvider)  // Mitesh
//      This single-line edit is the ONE sanctioned cross-boundary
//      edit to this file. Do not touch anything else here.
// The stub providers below return 0 so the wiring works and the
// dashboard/engine run before your real providers land.
// ---------------------------------------------------------------
// =============================================================

import { db } from '@/db'
import { departments, departmentScores, esgConfig } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'

export type ScorePeriod = string // "2026-07"

/** Canonical default period for the hackathon demo data. */
export const DEFAULT_PERIOD: ScorePeriod = '2026-07'

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

// =============================================================
// ENGINE — recalculate + persist department_scores, plus overall.
// =============================================================
const clamp100 = (n: number) => Math.max(0, Math.min(100, n))
const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Read live pillar weights from the esg_config singleton, falling back
 * to DEFAULT_WEIGHTS when the table is empty (never throws).
 */
export async function getWeights(): Promise<ScoreBreakdown> {
  const rows = await db.select().from(esgConfig).limit(1)
  const cfg = rows[0]
  if (!cfg) return { ...DEFAULT_WEIGHTS }
  return {
    environmental: cfg.weightEnvironmental,
    social: cfg.weightSocial,
    governance: cfg.weightGovernance,
  }
}

export interface DepartmentScoreRow {
  departmentId: string
  name: string
  code: string
  environmental: number
  social: number
  governance: number
  total: number
  rank: number
}

/**
 * Recalculate ESG scores for every ACTIVE department in a period.
 * For each department: fan in across registered providers (stubs return
 * 0 until real ones land), clamp each pillar 0..100, weight by esg_config,
 * UPSERT into department_scores on (departmentId, period), then rank
 * 1..n by total desc. Safe on empty tables (returns []).
 */
export async function recalculateAll(
  period: ScorePeriod = DEFAULT_PERIOD,
): Promise<DepartmentScoreRow[]> {
  registerProviders() // idempotent — ensure stubs/real providers are wired

  const weights = await getWeights()
  const activeDepts = await db
    .select()
    .from(departments)
    .where(eq(departments.status, 'ACTIVE'))

  if (activeDepts.length === 0) return []

  // Compute breakdown + total per department.
  const computed = await Promise.all(
    activeDepts.map(async (dept) => {
      const { breakdown } = await getScore(dept.id, period, weights)
      const environmental = clamp100(breakdown.environmental)
      const social = clamp100(breakdown.social)
      const governance = clamp100(breakdown.governance)
      const total = clamp100(
        environmental * weights.environmental +
          social * weights.social +
          governance * weights.governance,
      )
      return {
        departmentId: dept.id,
        name: dept.name,
        code: dept.code,
        environmental: round2(environmental),
        social: round2(social),
        governance: round2(governance),
        total: round2(total),
      }
    }),
  )

  // Rank 1..n by total desc (stable: tie-break by name for determinism).
  computed.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  const ranked: DepartmentScoreRow[] = computed.map((c, i) => ({
    ...c,
    rank: i + 1,
  }))

  // UPSERT each row on the (departmentId, period) unique index.
  for (const r of ranked) {
    await db
      .insert(departmentScores)
      .values({
        departmentId: r.departmentId,
        period,
        environmental: r.environmental,
        social: r.social,
        governance: r.governance,
        total: r.total,
        rank: r.rank,
      })
      .onConflictDoUpdate({
        target: [departmentScores.departmentId, departmentScores.period],
        set: {
          environmental: r.environmental,
          social: r.social,
          governance: r.governance,
          total: r.total,
          rank: r.rank,
          computedAt: sql`now()`,
        },
      })
  }

  return ranked
}

/**
 * Overall company ESG score for a period = weighted average of department
 * totals (equal-weighted across departments). Reads persisted rows so it
 * reflects the last recalculate. Returns 0 when no scores exist.
 */
export async function getOverall(
  period: ScorePeriod = DEFAULT_PERIOD,
): Promise<number> {
  const rows = await db
    .select({ total: departmentScores.total })
    .from(departmentScores)
    .where(eq(departmentScores.period, period))
  if (rows.length === 0) return 0
  const avg = rows.reduce((a, r) => a + r.total, 0) / rows.length
  return round2(avg)
}

// =============================================================
// STUB PROVIDERS — one per pillar.
// These exist so the registry/engine/dashboard have something to fan in
// over before the real pillar providers land. To keep the demo showing
// believable, non-zero, rankable numbers (and to make recalculate
// non-destructive), each stub returns the department's LAST PERSISTED
// value for its pillar (from the seed / previous recalculate), falling
// back to a deterministic code-derived number when no row exists yet.
// The moment a pillar owner REPLACES their stub in registerProviders()
// with a real provider, the real score takes over automatically.
// =============================================================

/** Last persisted pillar value for a department+period, or null. */
async function lastPersistedPillar(
  pillar: keyof ScoreBreakdown,
  deptId: string,
  period: ScorePeriod,
): Promise<number | null> {
  const rows = await db
    .select({
      environmental: departmentScores.environmental,
      social: departmentScores.social,
      governance: departmentScores.governance,
    })
    .from(departmentScores)
    .where(
      and(
        eq(departmentScores.departmentId, deptId),
        eq(departmentScores.period, period),
      ),
    )
    .limit(1)
  const row = rows[0]
  return row ? row[pillar] : null
}

/** Deterministic 55..85 fallback derived from the dept id (stable). */
function deterministicFallback(deptId: string): number {
  let h = 0
  for (let i = 0; i < deptId.length; i++) h = (h * 31 + deptId.charCodeAt(i)) | 0
  return 55 + (Math.abs(h) % 31) // 55..85
}

function makePillarStub(pillar: keyof ScoreBreakdown): ScoreProvider {
  return {
    pillar,
    name: `${pillar}-stub`,
    async getScore(deptId, period) {
      const persisted = await lastPersistedPillar(pillar, deptId, period)
      return persisted ?? deterministicFallback(deptId)
    },
  }
}

export const environmentalScoreStub: ScoreProvider = makePillarStub('environmental')
export const socialScoreStub: ScoreProvider = makePillarStub('social')
export const governanceScoreStub: ScoreProvider = makePillarStub('governance')

/**
 * Central registration point for domain ScoreProviders.
 * Sanctioned cross-boundary edit: each module owner REPLACES their
 * pillar's stub line below with ONE line registering their real
 * provider, e.g.:
 *
 *   registerProvider(environmentalScoreProvider)  // Mitesh
 *   registerProvider(socialScoreProvider)         // Hetvi
 *   registerProvider(governanceScoreProvider)     // Hetvi
 *
 * Guarded so it's safe to call more than once (idempotent).
 */
let registered = false
export function registerProviders() {
  if (registered) return
  registered = true

  // --- REAL PROVIDERS ---
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { environmentalScoreProvider } = require('@/server/services/score/environmental')
  registerProvider(environmentalScoreProvider) // Mitesh

  // --- STUBS (replace with your real provider) ---
  registerProvider(socialScoreStub) // Hetvi — replace with real social provider
  registerProvider(governanceScoreStub) // Hetvi — replace with real governance provider
}
