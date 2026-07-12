"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { createBadge } from "./actions";

export function BadgesTable({ initialBadges, isAdmin }: { initialBadges: any[], isAdmin: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createBadge(formData);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Failed to create badge.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setDrawerOpen(true)} className="bg-[#33503C] hover:bg-[#33503C]/90 text-white">
            + Define New Badge
          </Button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-semibold text-gray-600">Icon</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Badge Name</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Description</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Trigger Rule</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {initialBadges.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No badges defined yet.
                </td>
              </tr>
            ) : (
              initialBadges.map((badge) => (
                <tr key={badge.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-3xl">{badge.icon || "🏆"}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{badge.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">{badge.description}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      {badge.unlockXp ? (
                        <><span className="font-semibold text-[#33503C]">{badge.unlockXp}</span> <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">TOTAL_XP</span></>
                      ) : badge.unlockChallenges ? (
                        <><span className="font-semibold text-[#33503C]">{badge.unlockChallenges}</span> <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-1 rounded">CHALLENGES_COMPLETED</span></>
                      ) : (
                        <span className="text-gray-400">Manual</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      badge.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {badge.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAdmin && (
        <RecordDrawer 
          open={drawerOpen} 
          onOpenChange={setDrawerOpen} 
          title="Define New Badge"
          loading={isSaving}
          onSave={() => document.getElementById('create-badge-form-btn')?.click()}
        >
          <form id="create-badge-form" onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Name</label>
              <input name="name" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" placeholder="e.g. Tree Hugger" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={2} required className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon</label>
                <input name="icon" required defaultValue="🏆" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                <input name="triggerThreshold" type="number" min="1" required defaultValue="1" className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
              <select name="triggerType" required className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#33503C] focus:border-[#33503C]">
                <option value="TOTAL_XP">Total XP Earned</option>
                <option value="CHALLENGES_COMPLETED">Challenges Completed</option>
              </select>
            </div>

            <button type="submit" id="create-badge-form-btn" className="hidden" />
          </form>
        </RecordDrawer>
      )}
    </div>
  );
}
