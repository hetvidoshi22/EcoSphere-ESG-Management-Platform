"use server";

import { db } from "@/db";
import { challenges, categories, badges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Map difficulty to XP Reward as defined in the schema business rules
const difficultyXpMap: Record<string, number> = {
  EASY: 100,
  MEDIUM: 200,
  HARD: 300,
};

// Since relations might not be explicitly defined in schema.ts, let's use a standard select with leftJoin for safety.
export async function fetchChallengesData() {
  const rows = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      description: challenges.description,
      status: challenges.status,
      difficulty: challenges.difficulty,
      xpReward: challenges.xpReward,
      categoryName: categories.name,
      badgeName: badges.name,
      deadline: challenges.deadline,
    })
    .from(challenges)
    .leftJoin(categories, eq(challenges.categoryId, categories.id))
    .leftJoin(badges, eq(challenges.badgeId, badges.id))
    .orderBy(desc(challenges.createdAt));
  
  return rows;
}

export async function createChallenge(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const esgCategory = formData.get("esgCategory") as any;
  const difficulty = formData.get("difficulty") as any;
  const evidenceRequired = formData.get("evidenceRequired") === "on";
  const deadlineStr = formData.get("deadline") as string;
  const badgeId = formData.get("badgeId") as string;

  if (!title || !categoryId) {
    throw new Error("Title and Category are required");
  }

  const xpReward = difficultyXpMap[difficulty] || 200;
  const deadline = deadlineStr ? new Date(deadlineStr) : null;

  await db.insert(challenges).values({
    title,
    description,
    categoryId,
    esgCategory,
    difficulty,
    xpReward,
    evidenceRequired,
    badgeId: badgeId || null,
    deadline,
    status: "DRAFT",
  });

  revalidatePath("/challenges");
}

export async function updateChallengeStatus(id: string, newStatus: any) {
  await db.update(challenges).set({ status: newStatus }).where(eq(challenges.id, id));
  revalidatePath("/challenges");
}

export async function deleteChallenge(id: string) {
  // Guard: Only DRAFT challenges can be deleted
  const [challenge] = await db.select({ status: challenges.status }).from(challenges).where(eq(challenges.id, id));
  
  if (challenge && challenge.status === "DRAFT") {
    await db.delete(challenges).where(eq(challenges.id, id));
    revalidatePath("/challenges");
  } else {
    throw new Error("Only DRAFT challenges can be deleted");
  }
}
