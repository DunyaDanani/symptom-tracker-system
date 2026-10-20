// Inline validation message shown under a form field. Matches the style used
// by the Admit New Student wizard so every form reports errors the same way.
export default function FieldError({
  message,
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return <p className={`text-xs text-red-500 mt-1 ${className}`}>{message}</p>;
}
