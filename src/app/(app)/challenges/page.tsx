import { fetchChallengesData } from "./actions";
import { KanbanBoard } from "./kanban-board";
import { db } from "@/db";
import { categories, badges } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Challenges Kanban | EcoSphere",
};

export default async function ChallengesPage() {
  const [challengeRows, categoryRows, badgeRows] = await Promise.all([
    fetchChallengesData(),
    db.select().from(categories).where(eq(categories.type, "CHALLENGE")),
    db.select().from(badges).where(eq(badges.status, "ACTIVE"))
  ]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-semibold text-[#33503C]">Challenges Kanban</h1>
          <p className="text-sm text-gray-500 mt-1">Manage gamified challenges across their lifecycle.</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-x-auto p-8">
        <KanbanBoard 
          initialChallenges={challengeRows} 
          categories={categoryRows}
          badges={badgeRows}
        />
      </main>
    </div>
  );
}
