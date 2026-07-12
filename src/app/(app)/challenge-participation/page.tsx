import { fetchParticipations } from "./actions";
import { ParticipationTable } from "./participation-table";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Challenge Participation | EcoSphere",
};

export default async function ChallengeParticipationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userRole = (session.user as any).role || "EMPLOYEE";
  const isAdmin = userRole === "HR_MANAGER" || userRole === "ESG_MANAGER" || userRole === "ADMIN";
  
  const participations = await fetchParticipations();

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      <header className="px-8 py-8 bg-white border-b border-gray-200">
        <h1 className="text-3xl font-bold text-[#33503C] mb-2">Challenge Participations</h1>
        <p className="text-gray-500 max-w-2xl">
          Review employee proofs for gamified challenges. Approving a proof will instantly award XP and evaluate badge progress.
        </p>
      </header>
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <ParticipationTable data={participations} isAdmin={isAdmin} />
      </main>
    </div>
  );
}
