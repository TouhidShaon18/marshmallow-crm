export const REWARD_ITEMS = [
  "Pendant",
  "Keychain",
  "Anime action figure",
  "Anime plush toy",
  "Anime photo cards",
  "Anime wristband",
  "Anime-themed mousepad",
  "Anime tote bag",
  "LED anime lamp",
  "Anime square lamp",
  "Anime sticker",
  "Anime poster",
] as const;

export const RANKS = [
  { stamp: 0,  name: "—",              icon: "🎴" },
  { stamp: 1,  name: "Scout",          icon: "🔍" },
  { stamp: 2,  name: "Soul Reaper",    icon: "⚔️" },
  { stamp: 3,  name: "Hunter",         icon: "🏹" },
  { stamp: 4,  name: "Pro Hero",       icon: "🦸" },
  { stamp: 5,  name: "Hokage",         icon: "🌀" },
  { stamp: 6,  name: "Special Grade",  icon: "💜" },
  { stamp: 7,  name: "S-Class Hunter", icon: "⚡" },
  { stamp: 8,  name: "Hashira",        icon: "🔥" },
  { stamp: 9,  name: "Super Saiyan",   icon: "💥" },
  { stamp: 10, name: "Pirate King",    icon: "☠️" },
] as const;

export function getRank(stampCount: number) {
  const capped = Math.min(stampCount, 10);
  return RANKS[capped];
}
