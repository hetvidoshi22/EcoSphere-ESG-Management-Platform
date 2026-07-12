import { fetchCatalog, fetchWalletBalance } from "./actions";
import { RewardsCatalog } from "./rewards-catalog";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Rewards Catalog | EcoSphere",
};

export default async function RewardsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userRole = (session.user as any).role || "EMPLOYEE"; // NextAuth v5 typing might not include role by default, cast it
  
  const [rewards, walletBalance] = await Promise.all([
    fetchCatalog(),
    fetchWalletBalance(userId)
  ]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      <header className="px-8 py-10 bg-[#33503C] text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Rewards Catalog</h1>
            <p className="text-emerald-100/80 text-lg max-w-2xl">
              Spend your hard-earned XP on real-world rewards and perks!
            </p>
          </div>
          
          <div className="mt-6 md:mt-0 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
              💎
            </div>
            <div>
              <div className="text-emerald-100 text-sm font-medium">Spendable Balance</div>
              <div className="text-3xl font-bold font-mono tracking-tight">{walletBalance.toLocaleString()} <span className="text-lg">pts</span></div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <RewardsCatalog 
          initialRewards={rewards} 
          walletBalance={walletBalance} 
          userId={userId} 
          isAdmin={userRole === "HR_MANAGER" || userRole === "ESG_MANAGER" || userRole === "ADMIN"}
        />
      </main>
    </div>
  );
}
