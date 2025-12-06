import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  score: number;
  className?: string;
}

export function ConfidenceBar({ score, className }: ConfidenceBarProps) {
  const getColorClass = (score: number) => {
    if (score >= 75) return "bg-danger";
    if (score >= 50) return "bg-warning";
    if (score >= 25) return "bg-primary";
    return "bg-success";
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-8 w-full overflow-hidden rounded bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out flex items-center justify-center",
            getColorClass(score)
          )}
          style={{ width: `${Math.max(score, 5)}%` }}
        >
          <span className="text-sm font-bold text-primary-foreground drop-shadow-sm">
            {score}%
          </span>
        </div>
      </div>
    </div>
  );
}
