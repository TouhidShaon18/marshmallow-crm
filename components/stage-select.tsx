"use client";

import { useRef } from "react";
import { moveStage } from "@/app/followup-actions";
import { STAGES, STAGE_LABEL } from "@/lib/labels";

export default function StageSelect({
  customerId,
  current,
}: {
  customerId: string;
  current: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={moveStage}>
      <input type="hidden" name="customerId" value={customerId} />
      <select
        name="stage"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-md border border-brand-200 bg-white px-2 py-1 text-xs text-brand-800 outline-none focus:border-brand-500"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABEL[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
