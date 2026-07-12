import { db } from "@/db";
import { challengeParticipations, challenges } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { awardXpAndEvaluate } from "./badge";
import { notify } from "../notification";
import { emailChallengeApproved } from "../mail";

export async function joinChallenge(userId: string, challengeId: string) {
  // 1. Fetch challenge to check constraints
  const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));
  if (!challenge) throw new Error("Challenge not found");
  
  // Status check
  if (challenge.status !== "ACTIVE") {
    throw new Error("Challenge is not active");
  }

  // Deadline check
  if (challenge.deadline && new Date() > new Date(challenge.deadline)) {
    throw new Error("Challenge deadline has passed");
  }

  // Capacity check
  if (challenge.maxParticipants !== null) {
    const [stats] = await db
      .select({ count: count() })
      .from(challengeParticipations)
      .where(eq(challengeParticipations.challengeId, challengeId));
      
    if (stats && stats.count >= challenge.maxParticipants) {
      throw new Error("Challenge has reached maximum capacity");
    }
  }

  // 2. Insert participation (DB constraints prevent duplicate joins)
  // If evidenceRequired is false, they might immediately complete it, but we start at JOINED.
  const [participation] = await db.insert(challengeParticipations).values({
    userId,
    challengeId,
    status: "JOINED",
    progress: 0,
  }).returning();

  return participation;
}

export async function submitProof(participationId: string, userId: string, proofUrl: string) {
  // We don't have interactive transactions, so we just verify the challenge status in a subquery or separate query
  const [participation] = await db
    .select({ 
      pStatus: challengeParticipations.status,
      cStatus: challenges.status,
      userId: challengeParticipations.userId
    })
    .from(challengeParticipations)
    .innerJoin(challenges, eq(challengeParticipations.challengeId, challenges.id))
    .where(eq(challengeParticipations.id, participationId));

  if (!participation) throw new Error("Participation not found");
  if (participation.userId !== userId) throw new Error("Unauthorized");
  if (participation.cStatus !== "ACTIVE") throw new Error("Challenge is no longer active");
  
  if (participation.pStatus !== "JOINED" && participation.pStatus !== "REJECTED") {
    throw new Error("Invalid state transition for submitting proof");
  }

  const [updated] = await db.update(challengeParticipations)
    .set({ 
      proofUrl, 
      status: "PROOF_SUBMITTED",
      progress: 100 
    })
    .where(
      and(
        eq(challengeParticipations.id, participationId),
        // optimistic locking to prevent race conditions
        eq(challengeParticipations.status, participation.pStatus)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Could not update participation. The status may have changed.");
  }

  return updated;
}

export async function approveParticipation(participationId: string) {
  // 1. Fetch participation and parent challenge
  const [record] = await db
    .select({
      userId: challengeParticipations.userId,
      status: challengeParticipations.status,
      challengeId: challenges.id,
      xpReward: challenges.xpReward,
      title: challenges.title
    })
    .from(challengeParticipations)
    .innerJoin(challenges, eq(challengeParticipations.challengeId, challenges.id))
    .where(eq(challengeParticipations.id, participationId));

  if (!record) throw new Error("Record not found");
  
  if (record.status !== "PROOF_SUBMITTED") {
    throw new Error("Only PROOF_SUBMITTED participations can be approved");
  }

  // 2. Compute and disburse XP
  // We use the shared hook. It returns the final amount and handles the ledger/users table.
  const { amount } = await awardXpAndEvaluate(record.userId, record.xpReward, {
    source: `challenge:${record.challengeId}`
  });

  // 3. Mark completed and store the exact XP awarded
  const [updated] = await db.update(challengeParticipations)
    .set({ 
      status: "COMPLETED",
      xpAwarded: amount
    })
    .where(
      and(
        eq(challengeParticipations.id, participationId),
        eq(challengeParticipations.status, "PROOF_SUBMITTED")
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Concurrency error: The participation status changed before it could be approved.");
  }

  // 4. Notify user
  await notify(record.userId, "APPROVAL", "Challenge Approved!", `You earned ${amount} XP for completing a challenge.`);

  await emailChallengeApproved(record.userId, record.title, amount);

  return updated;
}

export async function rejectParticipation(participationId: string, reason: string) {
  const [updated] = await db.update(challengeParticipations)
    .set({ status: "REJECTED" })
    .where(
      and(
        eq(challengeParticipations.id, participationId),
        eq(challengeParticipations.status, "PROOF_SUBMITTED")
      )
    )
    .returning();
    
  if (!updated) {
    throw new Error("Only PROOF_SUBMITTED participations can be rejected");
  }

  await notify(updated.userId, "APPROVAL", "Challenge Proof Rejected", reason);
  return updated;
}
