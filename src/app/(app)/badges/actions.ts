"use server";

import { db } from "@/db";
import { badges } from "@/db/schema";
import { desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function fetchBadges() {
  return await db.select().from(badges);
}

export async function createBadge(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const icon = formData.get("icon") as string;
  
  const triggerType = formData.get("triggerType") as string;
  const triggerThreshold = parseInt(formData.get("triggerThreshold") as string);

  const unlockXp = triggerType === "TOTAL_XP" ? triggerThreshold : null;
  const unlockChallenges = triggerType === "CHALLENGES_COMPLETED" ? triggerThreshold : null;

  await db.insert(badges).values({
    name,
    description,
    icon,
    unlockXp,
    unlockChallenges,
    status: "ACTIVE"
  });

  revalidatePath("/badges");
}
