"use client";

import { LeaderboardRow } from "./actions";

export function LeaderboardTable({ data }: { data: LeaderboardRow[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No participants yet. Join a challenge to climb the ranks!
      </div>
    );
  }

  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <div className="flex flex-col gap-10">
      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-6 pt-8 pb-4">
          
          {/* Rank 2 (Silver) */}
          {top3[1] && (
            <PodiumCard 
              user={top3[1]} 
              rank={2} 
              height="h-[220px]" 
              gradient="from-slate-200 to-slate-300"
              borderColor="border-slate-300"
              badgeColor="bg-slate-500"
            />
          )}

          {/* Rank 1 (Gold) */}
          {top3[0] && (
            <PodiumCard 
              user={top3[0]} 
              rank={1} 
              height="h-[260px]" 
              gradient="from-yellow-100 to-yellow-300"
              borderColor="border-yellow-400"
              badgeColor="bg-yellow-600"
              isFirst
            />
          )}

          {/* Rank 3 (Bronze) */}
          {top3[2] && (
            <PodiumCard 
              user={top3[2]} 
              rank={3} 
              height="h-[190px]" 
              gradient="from-amber-100/60 to-amber-200"
              borderColor="border-amber-300"
              badgeColor="bg-amber-700"
            />
          )}

        </div>
      )}

      {/* Ranks 4+ Table */}
      {rest.length > 0 && (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-600 w-24 text-center">Rank</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Employee</th>
                <th className="px-6 py-4 font-semibold text-gray-600">Level</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Total XP</th>
                <th className="px-6 py-4 font-semibold text-gray-600 text-right">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rest.map((user, idx) => (
                <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4 text-center font-medium text-gray-500">#{idx + 4}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    {user.departmentName && (
                      <div className="text-xs text-gray-500">{user.departmentName}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4F7A5A]/10 text-[#33503C]">
                      {user.levelName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-[#33503C]">
                    {user.totalXp.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-700">
                    {user.badgeCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PodiumCard({ 
  user, rank, height, gradient, borderColor, badgeColor, isFirst = false 
}: { 
  user: LeaderboardRow, rank: number, height: string, gradient: string, borderColor: string, badgeColor: string, isFirst?: boolean
}) {
  return (
    <div className={`relative flex flex-col items-center w-full md:w-64 bg-gradient-to-b ${gradient} rounded-t-2xl border-t-2 border-l border-r ${borderColor} shadow-lg pt-6 px-4 ${height} transition-transform hover:-translate-y-2`}>
      
      {/* Crown for #1 */}
      {isFirst && (
        <div className="absolute -top-8 text-4xl animate-bounce">👑</div>
      )}

      {/* Rank Badge */}
      <div className={`absolute -top-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${badgeColor}`}>
        {rank}
      </div>

      <div className="mt-4 text-center">
        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{user.name}</h3>
        <div className="text-xs text-gray-700 opacity-80 mb-2">{user.departmentName || "General"}</div>
        
        <span className="inline-block px-2 py-1 bg-white/60 backdrop-blur-sm rounded text-xs font-semibold text-gray-800 mb-4 shadow-sm">
          {user.levelName}
        </span>
        
        <div className="font-mono text-2xl font-black text-gray-900 tracking-tight">
          {user.totalXp.toLocaleString()} <span className="text-sm font-bold text-gray-700">XP</span>
        </div>

        <div className="mt-2 text-xs font-medium text-gray-800 flex items-center justify-center gap-1">
          🏅 {user.badgeCount} Badges
        </div>
      </div>
    </div>
  );
}
