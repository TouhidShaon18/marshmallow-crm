"use client";

import { useActionState } from "react";
import { addStamp, removeStamp, claimHokageReward, claimPirateKingReward } from "@/app/loyalty-actions";
import { getRank, REWARD_ITEMS } from "@/lib/loyalty";

const RANK_NAMES = [
  "Scout", "Soul Reaper", "Hunter", "Pro Hero", "Hokage",
  "Special Grade", "S-Class Hunter", "Hashira", "Super Saiyan", "Pirate King",
];

type Props = {
  customerId: string;
  stampCount: number;
  hokageRewardClaimed: boolean;
  pirateKingRewardClaimed: boolean;
  pirateKingRewardItem: string | null;
};

export default function GuildCard({
  customerId,
  stampCount,
  hokageRewardClaimed,
  pirateKingRewardClaimed,
  pirateKingRewardItem,
}: Props) {
  const rank       = getRank(stampCount);
  const addAction  = addStamp.bind(null, customerId);
  const undoAction = removeStamp.bind(null, customerId);
  const hokageAction = claimHokageReward.bind(null, customerId);

  const [pirateState, pirateAction, piratePending] = useActionState(claimPirateKingReward, undefined);

  const showHokageReward    = stampCount >= 5  && !hokageRewardClaimed;
  const hokageAlreadyClaimed = stampCount >= 5 && hokageRewardClaimed && stampCount < 10;
  const showPirateReward    = stampCount >= 10 && !pirateKingRewardClaimed;

  return (
    <div className="space-y-4">

      {/* Rank badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{rank.icon}</span>
          <div>
            <p className="font-bold text-brand-900">{rank.name}</p>
            <p className="text-xs text-brand-700/50">
              {stampCount < 10 ? `${stampCount}/10 stamps` : "Card complete"}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <form action={undoAction}>
            <button
              type="submit"
              className="rounded-lg border border-brand-200 px-2 py-1 text-xs text-brand-600 hover:bg-brand-50"
              title="Remove last stamp"
            >
              −
            </button>
          </form>
          <form action={addAction}>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
            >
              + Stamp
            </button>
          </form>
        </div>
      </div>

      {/* Stamp grid */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => {
          const n         = i + 1;
          const filled    = n <= stampCount;
          const isMilestone = n === 5 || n === 10;
          const rankName  = RANK_NAMES[i];
          return (
            <div key={n} className="flex flex-col items-center gap-1">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all
                ${filled
                  ? isMilestone
                    ? "border-amber-400 bg-amber-400 text-white shadow-md"
                    : "border-brand-500 bg-brand-500 text-white"
                  : "border-brand-200 bg-white text-brand-300"
                }`}
              >
                {filled ? (isMilestone ? "★" : "✓") : n}
              </div>
              <span className="text-center text-[9px] leading-tight text-brand-700/50">{rankName}</span>
            </div>
          );
        })}
      </div>

      {/* Hokage reward (stamp 5) */}
      {showHokageReward && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
          <p className="font-semibold text-amber-800">🎉 Hokage reward unlocked!</p>
          <p className="text-sm text-amber-700">10% OFF on next order — up to ৳1,000</p>
          <form action={hokageAction}>
            <button type="submit" className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-600">
              Mark as given
            </button>
          </form>
        </div>
      )}

      {hokageAlreadyClaimed && (
        <p className="text-xs text-brand-700/40">✅ Hokage reward (10% off) already given</p>
      )}

      {/* Pirate King reward (stamp 10) */}
      {showPirateReward && (
        <div className="rounded-xl border-2 border-purple-300 bg-purple-50 p-4 space-y-3">
          <p className="font-semibold text-purple-800">🏆 Pirate King reward unlocked!</p>
          <p className="text-sm text-purple-700">Choose: one gift item OR 50% off up to ৳3,000</p>

          {pirateState?.error && (
            <p className="text-sm text-red-600">{pirateState.error}</p>
          )}

          <form action={pirateAction} className="space-y-3">
            <input type="hidden" name="customerId" value={customerId} />

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="rewardType" value="item" defaultChecked className="accent-purple-600" />
                <span className="text-sm font-medium text-purple-900">Gift item</span>
              </label>
              <select name="item" className="input ml-5 text-sm">
                {REWARD_ITEMS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="rewardType" value="discount" className="accent-purple-600" />
              <span className="text-sm font-medium text-purple-900">50% discount up to ৳3,000</span>
            </label>

            <button
              type="submit"
              disabled={piratePending}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {piratePending ? "Saving…" : "Confirm & reset card"}
            </button>
          </form>
        </div>
      )}

      {/* Past Pirate King reward */}
      {pirateKingRewardClaimed && pirateKingRewardItem && (
        <p className="text-xs text-brand-700/40">✅ Pirate King reward given: {pirateKingRewardItem}</p>
      )}
    </div>
  );
}
