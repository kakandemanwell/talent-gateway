import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const tone =
    score >= 85 ? "bg-success/10 text-success border-success/20"
    : score >= 70 ? "bg-info/10 text-info border-info/20"
    : score >= 55 ? "bg-warning/10 text-warning border-warning/20"
    : "bg-muted text-muted-foreground border-border";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn(tone, size === "md" && "px-2.5 py-1 text-sm")}>
            <Sparkles className="mr-1 h-3 w-3" /> {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Match score from external scoring API</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
