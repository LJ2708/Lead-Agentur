"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface KontaktversuchTrackerProps {
  leadId: string;
  kontaktversuche: number;
  maxKontaktversuche: number;
  onAttemptLogged?: () => void;
}

export function KontaktversuchTracker({
  leadId,
  kontaktversuche,
  maxKontaktversuche,
  onAttemptLogged,
}: KontaktversuchTrackerProps) {
  const [isLogging, setIsLogging] = useState(false);
  const supabase = createClient();

  const maxReached = kontaktversuche >= maxKontaktversuche;

  function getColor(): string {
    if (kontaktversuche >= maxKontaktversuche) return "red";
    if (kontaktversuche >= 3) return "yellow";
    return "green";
  }

  const color = getColor();

  const dotColorMap: Record<string, { filled: string; empty: string }> = {
    green: {
      filled: "bg-emerald-500",
      empty: "bg-emerald-200 hover:bg-emerald-300",
    },
    yellow: {
      filled: "bg-amber-500",
      empty: "bg-amber-200 hover:bg-amber-300",
    },
    red: {
      filled: "bg-red-500",
      empty: "bg-red-200 hover:bg-red-300",
    },
  };

  async function handleLogAttempt(dotIndex: number) {
    // Only allow clicking the next unfilled dot
    if (dotIndex !== kontaktversuche) return;
    if (maxReached || isLogging) return;

    setIsLogging(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLogging(false);
      return;
    }

    // Increment kontaktversuche on the lead
    await supabase
      .from("leads")
      .update({
        kontaktversuche: kontaktversuche + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Create activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      type: "anruf" as const,
      title: "Kontaktversuch",
      description: `Kontaktversuch ${kontaktversuche + 1} von ${maxKontaktversuche}`,
      created_by: user.id,
    });

    setIsLogging(false);
    onAttemptLogged?.();
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: maxKontaktversuche }).map((_, i) => {
            const isFilled = i < kontaktversuche;
            const isNext = i === kontaktversuche && !maxReached;

            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={!isNext || isLogging}
                    onClick={() => handleLogAttempt(i)}
                    className={cn(
                      "h-3 w-3 rounded-full transition-all",
                      isFilled
                        ? dotColorMap[color].filled
                        : dotColorMap[color].empty,
                      isNext && !isLogging && "cursor-pointer ring-2 ring-offset-1 ring-gray-300",
                      !isNext && "cursor-default"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {isFilled
                    ? `Versuch ${i + 1} erledigt`
                    : isNext
                      ? "Klicken um Versuch zu loggen"
                      : `Versuch ${i + 1}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {isLogging ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-xs text-muted-foreground">
            {kontaktversuche} / {maxKontaktversuche} Versuche
          </span>
        )}

        {maxReached && (
          <Badge
            variant="destructive"
            className="text-[10px] px-1.5 py-0"
          >
            Maximum erreicht
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
