"use client";

type Props = {
  action: () => Promise<void>;
  /** Confirmation message shown in the dialog */
  message?: string;
  label?: string;
  className?: string;
};

export default function DeleteButton({
  action,
  message = "Are you sure you want to delete this? This cannot be undone.",
  label = "Delete",
  className = "text-sm text-red-600 hover:underline",
}: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={className}
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
      >
        {label}
      </button>
    </form>
  );
}
