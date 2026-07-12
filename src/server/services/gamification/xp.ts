import { db } from "@/db";
import { 
  esgConfig, xpLedger, users, employeeParticipations, challengeParticipations, LEVELS 
} from "@/db/schema";
import { eq, sql, and, gte, count } from "drizzle-orm";

export function levelFor(totalXp: number) {
  let currentLevel: typeof LEVELS[number] = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXp >= level.min) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
}

interface AwardOpts {
  source: string; // e.g. "csr:<id>", "challenge:<id>"
  joinedAt?: Date; // used to calculate earlyBird bonus
  deptIsLowest?: boolean; // used to calculate deptMultiplier
}

export async function award(userId: string, baseXp: number, opts: AwardOpts) {
  // 1. Read config
  const [config] = await db.select().from(esgConfig).limit(1);
  if (!config) throw new Error("ESG Config not found");

  let finalAmount = baseXp;
  const breakdown: Record<string, number> = { base: baseXp };

  // 2. Apply Early Bird Bonus
  if (config.earlyBirdEnabled && opts.joinedAt) {
    const hoursSinceJoin = (Date.now() - opts.joinedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceJoin < 48) {
      finalAmount += 20;
      breakdown.earlyBird = 20;
    }
  }

  // 3. Apply Streak Bonus (+10% if >= 4 APPROVED participations in last 28 days)
  if (config.streakBonusEnabled) {
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    // Count CSR
    const [csrCount] = await db
      .select({ count: count() })
      .from(employeeParticipations)
      .where(
        and(
          eq(employeeParticipations.userId, userId),
          eq(employeeParticipations.approvalStatus, "APPROVED"),
          gte(employeeParticipations.completionDate, twentyEightDaysAgo)
        )
      );

    // Count Challenges
    const [challengeCount] = await db
      .select({ count: count() })
      .from(challengeParticipations)
      .where(
        and(
          eq(challengeParticipations.userId, userId),
          eq(challengeParticipations.status, "COMPLETED"),
          gte(challengeParticipations.createdAt, twentyEightDaysAgo) // approximating completion date
        )
      );

    const totalRecent = (csrCount?.count || 0) + (challengeCount?.count || 0);

    if (totalRecent >= 4) {
      const streakBonus = Math.floor(finalAmount * 0.10);
      finalAmount += streakBonus;
      breakdown.streak = streakBonus;
    }
  }

  // 4. Apply Department Multiplier (1.15x)
  if (config.deptMultiplierEnabled && opts.deptIsLowest) {
    const orig = finalAmount;
    finalAmount = Math.floor(finalAmount * 1.15);
    breakdown.deptMultiplier = finalAmount - orig;
  }

  // 5. Database Batch (Neon HTTP doesn't support interactive transactions)
  await db.batch([
    // Insert into ledger
    db.insert(xpLedger).values({
      userId,
      amount: finalAmount,
      source: opts.source,
    }),
    // Increment users.totalXp
    db.update(users)
      .set({ totalXp: sql`${users.totalXp} + ${finalAmount}` })
      .where(eq(users.id, userId))
  ]);

  return {
    amount: finalAmount,
    breakdown,
  };
}
