"use server";

import { db } from "@/db";
import { challengeParticipations, challenges, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { approveParticipation, rejectParticipation } from "@/server/services/gamification/participation";
import { revalidatePath } from "next/cache";

export async function fetchParticipations() {
  const data = await db
    .select({
      id: challengeParticipations.id,
      status: challengeParticipations.status,
      proofUrl: challengeParticipations.proofUrl,
      createdAt: challengeParticipations.createdAt,
      xpAwarded: challengeParticipations.xpAwarded,
      challengeTitle: challenges.title,
      challengeXp: challenges.xpReward,
      userName: users.name,
      userId: users.id
    })
    .from(challengeParticipations)
    .innerJoin(challenges, eq(challengeParticipations.challengeId, challenges.id))
    .innerJoin(users, eq(challengeParticipations.userId, users.id))
    .orderBy(desc(challengeParticipations.createdAt));

  return data;
}

export async function handleApprove(participationId: string) {
  try {
    await approveParticipation(participationId);
    revalidatePath("/challenge-participation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function handleReject(participationId: string) {
  try {
    await rejectParticipation(participationId, "Proof was rejected by admin.");
    revalidatePath("/challenge-participation");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
