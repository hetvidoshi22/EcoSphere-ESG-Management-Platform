import { db } from "@/db";
import { rewards, rewardRedemptions, xpLedger, users } from "@/db/schema";
import { eq, and, gt, sql, sum } from "drizzle-orm";
import { emailRewardRedeemed } from "@/server/services/mail";

export async function getPointsBalance(userId: string): Promise<number> {
  // Fetch lifetime XP
  const [user] = await db.select({ totalXp: users.totalXp }).from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");

  // Fetch total points spent on rewards
  const [redemptions] = await db
    .select({ totalSpent: sum(rewardRedemptions.pointsSpent) })
    .from(rewardRedemptions)
    .where(eq(rewardRedemptions.userId, userId));

  // Points spent is returned as a string from postgres sum, so we parse it
  const spent = redemptions?.totalSpent ? parseInt(String(redemptions.totalSpent), 10) : 0;

  // Spendable points = lifetime XP - total spent
  return user.totalXp - spent;
}

export async function redeem(userId: string, rewardId: string) {
  // 1. Fetch the reward
  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId));
  if (!reward) throw new Error("Reward not found");

  // 2. Validate stock
  if (reward.stock <= 0) {
    throw new Error("Out of stock");
  }

  // 3. Validate points balance
  const balance = await getPointsBalance(userId);
  if (balance < reward.pointsRequired) {
    throw new Error("Not enough points");
  }

  // 4. Execute redemption batch
  // Note: Using neon-http driver means we don't have interactive transactions.
  // We use a WHERE clause on the update to ensure we don't decrement stock if someone else took the last one.
  const [updateResult] = await db
    .update(rewards)
    .set({ stock: sql`${rewards.stock} - 1` })
    .where(and(
      eq(rewards.id, rewardId),
      gt(rewards.stock, 0)
    ))
    .returning({ updatedId: rewards.id });

  // If the update returned nothing, someone else grabbed the last stock between our check and update
  if (!updateResult) {
    throw new Error("Out of stock");
  }

  // Stock successfully decremented, now insert receipts
  await db.batch([
    // Log the redemption
    db.insert(rewardRedemptions).values({
      rewardId: reward.id,
      userId: userId,
      pointsSpent: reward.pointsRequired,
    }),
    
    // Add negative entry to the ledger to keep track of spending history
    // Crucially, we DO NOT modify users.totalXp
    db.insert(xpLedger).values({
      userId: userId,
      amount: -reward.pointsRequired,
      source: `redeem:${reward.id}`,
    })
  ]);

  await emailRewardRedeemed(userId, reward.name, reward.pointsRequired);

  return { success: true, reward };
}
