// Shared display labels + colors for stages and task channels.

export const STAGES = [
  "NEW_LEAD",
  "CONTACTED",
  "INTERESTED",
  "PURCHASED",
  "REPEAT",
  "LOST",
] as const;
export type StageKey = (typeof STAGES)[number];

export const STAGE_LABEL: Record<StageKey, string> = {
  NEW_LEAD: "New Lead",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  PURCHASED: "Purchased",
  REPEAT: "Repeat",
  LOST: "Lost",
};

export const STAGE_COLOR: Record<StageKey, string> = {
  NEW_LEAD: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-sky-100 text-sky-700",
  INTERESTED: "bg-amber-100 text-amber-700",
  PURCHASED: "bg-green-100 text-green-700",
  REPEAT: "bg-brand-100 text-brand-700",
  LOST: "bg-red-100 text-red-600",
};

export type ChannelKey = "WHATSAPP" | "EMAIL" | "CALL" | "TASK";

export const CHANNEL_LABEL: Record<ChannelKey, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  CALL: "Call",
  TASK: "Task",
};

export const CHANNEL_ICON: Record<ChannelKey, string> = {
  WHATSAPP: "💬",
  EMAIL: "📧",
  CALL: "📞",
  TASK: "✅",
};
