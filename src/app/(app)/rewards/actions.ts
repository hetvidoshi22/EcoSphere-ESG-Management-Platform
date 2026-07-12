"use server";

import { db } from "@/db";
import { rewards } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redeem, getPointsBalance } from "@/server/services/gamification/reward";
import { revalidatePath } from "next/cache";

// Admin action to fetch all, employee action to fetch ACTIVE is handled by UI filter for simplicity, 
// or we can fetch only ACTIVE. We'll fetch all and let UI sort it out based on role.
export async function fetchCatalog() {
  return await db.select().from(rewards); // Removed orderBy since createdAt doesn't exist
}

export async function fetchWalletBalance(userId: string) {
  return await getPointsBalance(userId);
}

export async function checkoutReward(userId: string, rewardId: string) {
  try {
    const result = await redeem(userId, rewardId);
    revalidatePath("/rewards");
    return { success: true, reward: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createRewardItem(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const pointsRequired = parseInt(formData.get("pointsRequired") as string);
  const stock = parseInt(formData.get("stock") as string);

  await db.insert(rewards).values({
    name,
    description,
    pointsRequired,
    stock,
    status: "ACTIVE"
  });

  revalidatePath("/rewards");
}

export async function updateRewardStock(id: string, newStock: number) {
  await db.update(rewards).set({ stock: newStock }).where(eq(rewards.id, id));
  revalidatePath("/rewards");
}
