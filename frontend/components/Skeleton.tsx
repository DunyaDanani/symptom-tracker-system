// Grey placeholder shapes shown while a page's data loads, so the layout
// appears immediately instead of a bare "Loading..." line.

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

export default function LoadingSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="bg-white rounded-md shadow-sm p-5 space-y-3">
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-3 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Lighter version for inside an existing card (no card backgrounds). */
export function InlineSkeleton({
  rows = 3,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-live="polite">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <SkeletonBlock className="h-3 w-1/4" />
          <SkeletonBlock className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
