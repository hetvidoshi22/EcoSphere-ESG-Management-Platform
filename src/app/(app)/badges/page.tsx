import { fetchBadges } from "./actions";
import { BadgesTable } from "./badges-table";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Badges Management | EcoSphere",
};

export default async function BadgesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "EMPLOYEE";
  const isAdmin = userRole === "HR_MANAGER" || userRole === "ESG_MANAGER" || userRole === "ADMIN";
  
  const badges = await fetchBadges();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      <header className="px-8 py-8 bg-white border-b border-gray-200">
        <h1 className="text-3xl font-bold text-[#33503C] mb-2">Gamification Badges</h1>
        <p className="text-gray-500 max-w-2xl">
          Define the badges employees can earn by completing sustainability actions across the platform.
        </p>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <BadgesTable initialBadges={badges} isAdmin={isAdmin} />
      </main>
    </div>
  );
}
