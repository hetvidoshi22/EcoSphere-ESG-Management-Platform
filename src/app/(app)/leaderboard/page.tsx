import { getLeaderboard } from "./actions";
import { LeaderboardTable } from "./leaderboard-table";

export const metadata = {
  title: "Leaderboard | EcoSphere",
};

export default async function LeaderboardPage() {
  const users = await getLeaderboard();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      <header className="px-8 py-10 bg-gradient-to-r from-[#203a27] to-[#33503C] text-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-white">Global Leaderboard</h1>
          <p className="text-emerald-100/80 text-lg max-w-2xl">
            See who is leading the charge in our sustainability goals. Climb the ranks by participating in CSR activities and completing ESG challenges.
          </p>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-6xl mx-auto px-8 -mt-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 min-h-[500px]">
          <LeaderboardTable data={users} />
        </div>
      </main>
    </div>
  );
}
