"use client";

import { useRouter } from "next/navigation";

export default function PeriodPicker({
  value,
  basePath,
}: {
  value: string;
  basePath: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-brand-700">Month:</label>
      <input
        type="month"
        value={value}
        className="input text-sm w-auto"
        onChange={(e) => {
          if (e.target.value) router.push(`${basePath}?period=${e.target.value}`);
        }}
      />
    </div>
  );
}
