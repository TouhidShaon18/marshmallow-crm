"use client";

import { useTransition } from "react";
import { generateMonth } from "@/app/social-actions";

export default function GenerateMonthButton({ period, label }: { period: string; label: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await generateMonth(period);
      if (result.created === 0) {
        alert("All templates already generated for this month, or no active templates found.");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="btn-primary"
    >
      {pending ? "Generating…" : `🗓️ Generate ${label} plan`}
    </button>
  );
}
