"use client";

export default function WhatsAppButton({
  number,
  name,
}: {
  number: string | null;
  name: string;
}) {
  if (!number) {
    return (
      <span className="btn-secondary cursor-not-allowed opacity-50" title="No WhatsApp number on file">
        💬 No WhatsApp number
      </span>
    );
  }

  const digits = number.replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("88") ? digits : `88${digits}`;
  const text = encodeURIComponent(`Hi ${name}, this is your anime store 🍡`);
  const url = `https://wa.me/${normalized}?text=${text}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary bg-green-600 hover:bg-green-700">
      💬 Message on WhatsApp
    </a>
  );
}
