"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors"
    >
      {copied ? "✅ Copied!" : "Copy"}
    </button>
  );
}
