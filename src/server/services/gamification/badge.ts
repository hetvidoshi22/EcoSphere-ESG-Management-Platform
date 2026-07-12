import { db } from "@/db";
import { 
  esgConfig, users, badges, badgeAwards, challengeParticipations 
} from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { notify } from "@/server/services/notification";
import { emailBadgeUnlocked } from "@/server/services/mail";
import { award, levelFor } from "./xp";

export async function evaluate(userId: string) {
  // 1. Check if auto-award is enabled
  const [config] = await db.select().from(esgConfig).limit(1);
  if (!config?.badgeAutoAward) return;

  // 2. Fetch user data (totalXp)
  const [user] = await db.select({ totalXp: users.totalXp }).from(users).where(eq(users.id, userId));
  if (!user) return;

  // 3. Fetch completed challenges count
  const [challengesRecord] = await db
    .select({ count: count() })
    .from(challengeParticipations)
    .where(
      and(
        eq(challengeParticipations.userId, userId),
        eq(challengeParticipations.status, "COMPLETED")
      )
    );
  const completedChallenges = challengesRecord?.count || 0;

  // 4. Fetch all ACTIVE badges
  const activeBadges = await db.select().from(badges).where(eq(badges.status, "ACTIVE"));

  // 5. Evaluate and award
  for (const badge of activeBadges) {
    let qualifies = false;
    
    if (badge.unlockXp !== null && user.totalXp >= badge.unlockXp) {
      qualifies = true;
    }
    if (badge.unlockChallenges !== null && completedChallenges >= badge.unlockChallenges) {
      qualifies = true;
    }

    if (qualifies) {
      try {
        // Insert using onConflictDoNothing to ensure idempotency
        const result = await db.insert(badgeAwards).values({
          badgeId: badge.id,
          userId: userId,
        }).onConflictDoNothing();

        // If a row was actually inserted, we fire a notification
        if (result.rowCount && result.rowCount > 0) {
          await notify(
            userId,
            "BADGE",
            `New Badge Unlocked: ${badge.name}`,
            `You earned the ${badge.name} badge! Check it out in your profile.`
          );
          await emailBadgeUnlocked(userId, badge.name, badge.icon);
        }
      } catch (error) {
        console.error("Error awarding badge:", error);
      }
    }
  }
}

/**
 * Convenience hook intended to be used by other modules (like CSR approvals).
 * Awards XP and then immediately evaluates for any newly unlocked badges.
 */
export async function awardXpAndEvaluate(
  userId: string, 
  baseXp: number, 
  opts: { source: string, joinedAt?: Date, deptIsLowest?: boolean }
) {
  const result = await award(userId, baseXp, opts);
  await evaluate(userId);
  return result;
}
