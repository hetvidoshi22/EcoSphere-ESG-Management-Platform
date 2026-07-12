import { db } from '@/db'
import { esgConfig } from '@/db/schema'

export interface EsgConfigView {
  weightEnvironmental: number
  weightSocial: number
  weightGovernance: number
  evidenceRequired: boolean
  badgeAutoAward: boolean
}

const FALLBACK: EsgConfigView = {
  weightEnvironmental: 0.4,
  weightSocial: 0.3,
  weightGovernance: 0.3,
  evidenceRequired: true,
  badgeAutoAward: true,
}

/** Read the ESG config singleton (weights + toggles). Falls back to defaults. */
export async function getEsgConfig(): Promise<EsgConfigView> {
  try {
    const [row] = await db.select().from(esgConfig).limit(1)
    if (!row) return FALLBACK
    return {
      weightEnvironmental: row.weightEnvironmental,
      weightSocial: row.weightSocial,
      weightGovernance: row.weightGovernance,
      evidenceRequired: row.evidenceRequired,
      badgeAutoAward: row.badgeAutoAward,
    }
  } catch {
    return FALLBACK
  }
}
