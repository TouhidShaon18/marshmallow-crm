export const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  purple: { bg: "bg-brand-100", text: "text-brand-700" },
  blue:   { bg: "bg-blue-100",  text: "text-blue-700" },
  green:  { bg: "bg-green-100", text: "text-green-700" },
  red:    { bg: "bg-red-100",   text: "text-red-700" },
  amber:  { bg: "bg-amber-100", text: "text-amber-700" },
  sky:    { bg: "bg-sky-100",   text: "text-sky-700" },
  pink:   { bg: "bg-pink-100",  text: "text-pink-700" },
};

export const TAG_COLOR_KEYS = Object.keys(TAG_COLORS);

type Props = {
  name: string;
  color: string;
  onRemove?: () => void;
};

export default function TagBadge({ name, color, onRemove }: Props) {
  const c = TAG_COLORS[color] ?? TAG_COLORS.purple;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full hover:opacity-70"
          aria-label={`Remove tag ${name}`}
        >
          ✕
        </button>
      )}
    </span>
  );
}
