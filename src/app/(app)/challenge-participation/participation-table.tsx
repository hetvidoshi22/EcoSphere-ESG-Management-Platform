"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { handleApprove, handleReject } from "./actions";

export function ParticipationTable({ data, isAdmin }: { data: any[], isAdmin: boolean }) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function onApprove(id: string) {
    if (!confirm("Are you sure you want to approve this proof? XP will be awarded immediately.")) return;
    setProcessingId(id);
    const res = await handleApprove(id);
    if (!res.success) alert("Failed to approve: " + res.error);
    setProcessingId(null);
  }

  async function onReject(id: string) {
    if (!confirm("Are you sure you want to reject this proof? The employee will need to resubmit.")) return;
    setProcessingId(id);
    const res = await handleReject(id);
    if (!res.success) alert("Failed to reject: " + res.error);
    setProcessingId(null);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-6 py-4 font-semibold text-gray-600">Employee</th>
            <th className="px-6 py-4 font-semibold text-gray-600">Challenge</th>
            <th className="px-6 py-4 font-semibold text-gray-600 text-center">Status</th>
            <th className="px-6 py-4 font-semibold text-gray-600">Proof</th>
            {isAdmin && <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                No participations found. When employees join challenges, they will appear here.
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">{row.userName}</td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 font-medium">{row.challengeTitle}</div>
                  <div className="text-xs text-gray-500">{row.challengeXp} XP Reward</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-6 py-4">
                  {row.proofUrl ? (
                    <a href={row.proofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">
                      View Proof ↗
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">Not submitted</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right space-x-2">
                    {row.status === "PROOF_SUBMITTED" ? (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={processingId === row.id}
                          onClick={() => onApprove(row.id)}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          disabled={processingId === row.id}
                          onClick={() => onReject(row.id)}
                        >
                          Reject
                        </Button>
                      </>
                    ) : row.status === "COMPLETED" ? (
                      <span className="text-xs text-gray-500">Awarded {row.xpAwarded} XP</span>
                    ) : (
                      <span className="text-xs text-gray-400">Waiting for proof</span>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let bg = "bg-gray-100 text-gray-800";
  if (status === "JOINED") bg = "bg-blue-100 text-blue-800";
  if (status === "PROOF_SUBMITTED") bg = "bg-yellow-100 text-yellow-800 animate-pulse";
  if (status === "COMPLETED") bg = "bg-green-100 text-green-800";
  if (status === "REJECTED") bg = "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg}`}>
      {status.replace("_", " ")}
    </span>
  );
}
