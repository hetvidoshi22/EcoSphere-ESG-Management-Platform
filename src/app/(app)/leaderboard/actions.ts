"use server";

import { db } from "@/db";
import { users, departments, badgeAwards } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { levelFor } from "@/server/services/gamification/xp";

export type LeaderboardRow = {
  id: string;
  name: string;
  totalXp: number;
  departmentName: string | null;
  badgeCount: number;
  levelName: string;
};

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  // Aggregate badge counts per user
  const badgeCounts = db.$with("badge_counts").as(
    db.select({
      userId: badgeAwards.userId,
      count: sql<number>`count(${badgeAwards.id})::int`.as("count"),
    })
    .from(badgeAwards)
    .groupBy(badgeAwards.userId)
  );

  const rows = await db
    .with(badgeCounts)
    .select({
      id: users.id,
      name: users.name,
      totalXp: users.totalXp,
      departmentName: departments.name,
      badgeCount: sql<number>`COALESCE(${badgeCounts.count}, 0)::int`,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .leftJoin(badgeCounts, eq(users.id, badgeCounts.userId))
    .orderBy(desc(users.totalXp))
    .limit(100); // Limit to top 100 for performance

  return rows.map((row) => ({
    ...row,
    levelName: levelFor(row.totalXp).name,
  }));
}
