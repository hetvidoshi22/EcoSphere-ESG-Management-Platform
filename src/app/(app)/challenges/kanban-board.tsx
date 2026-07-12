"use client";

import { useState } from "react";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { Button } from "@/components/ui/button";
import { createChallenge, updateChallengeStatus, deleteChallenge } from "./actions";

// Define the 5 explicit statuses from the schema
const COLUMNS = ["DRAFT", "UNDER_REVIEW", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;

export function KanbanBoard({ initialChallenges, categories, badges }: { 
  initialChallenges: any[],
  categories: any[],
  badges: any[]
}) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Group challenges by status
  const grouped = COLUMNS.reduce((acc, status) => {
    acc[status] = challenges.filter(c => c.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createChallenge(formData);
      // In a real app we'd fetch the new list or let Next.js revalidate do it, 
      // but since Server Actions with revalidatePath refresh the page data, 
      // we can just reload or let Next.js handle the server state update.
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdvanceStatus(id: string, currentStatus: string) {
    const currentIndex = COLUMNS.indexOf(currentStatus as any);
    if (currentIndex < COLUMNS.length - 1) {
      const nextStatus = COLUMNS[currentIndex + 1];
      
      // Optimistic update
      setChallenges(prev => prev.map(c => c.id === id ? { ...c, status: nextStatus } : c));
      
      try {
        await updateChallengeStatus(id, nextStatus);
      } catch (err) {
        // Revert on failure
        setChallenges(initialChallenges);
      }
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Delete this draft challenge?")) {
      setChallenges(prev => prev.filter(c => c.id !== id));
      await deleteChallenge(id);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <Button onClick={() => setDrawerOpen(true)} className="bg-[#33503C] hover:bg-[#33503C]/90 text-white">
          + Create Challenge
        </Button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 h-full">
        {COLUMNS.map(col => (
          <div key={col} className="min-w-[300px] w-[300px] flex flex-col bg-gray-50/50 rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-100/50 rounded-t-xl">
              <h3 className="font-semibold text-gray-700 flex items-center justify-between">
                {col.replace("_", " ")}
                <span className="text-xs bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full">
                  {grouped[col].length}
                </span>
              </h3>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              {grouped[col].map(challenge => (
                <div key={challenge.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-[#4F7A5A] bg-[#4F7A5A]/10 px-2 py-1 rounded">
                      {challenge.categoryName || "General"}
                    </span>
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      ⭐ {challenge.xpReward} XP
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{challenge.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{challenge.description}</p>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                    {col === "DRAFT" ? (
                      <button onClick={() => handleDelete(challenge.id)} className="text-xs text-red-500 hover:underline">
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {challenge.difficulty}
                      </span>
                    )}

                    {col !== "ARCHIVED" && (
                      <button 
                        onClick={() => handleAdvanceStatus(challenge.id, challenge.status)}
                        className="text-xs font-medium text-[#33503C] hover:underline flex items-center gap-1"
                      >
                        Advance →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {grouped[col].length === 0 && (
                <div className="text-center p-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                  No challenges here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <RecordDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        title="Create Challenge"
        loading={isSaving}
        onSave={() => document.getElementById('submit-btn')?.click()}
      >
        <form id="create-challenge-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input name="title" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="categoryId" required className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option value="">Select...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ESG Dimension</label>
              <select name="esgCategory" required className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option value="ENVIRONMENTAL">Environmental</option>
                <option value="SOCIAL">Social</option>
                <option value="GOVERNANCE">Governance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select name="difficulty" required className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option value="EASY">Easy (100 XP)</option>
                <option value="MEDIUM">Medium (200 XP)</option>
                <option value="HARD">Hard (300 XP)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge (Optional)</label>
              <select name="badgeId" className="w-full border border-gray-300 rounded-md p-2 bg-white">
                <option value="">None</option>
                {badges.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="evidenceRequired" name="evidenceRequired" defaultChecked className="rounded text-[#33503C] focus:ring-[#33503C]" />
            <label htmlFor="evidenceRequired" className="text-sm text-gray-700">Proof of completion required</label>
          </div>

          {/* Hidden submit button triggered by RecordDrawer's footer */}
          <button type="submit" id="submit-btn" className="hidden" />
        </form>
      </RecordDrawer>
    </div>
  );
}
