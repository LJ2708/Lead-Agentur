import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

const sizes = {
  sm: { width: 120, height: 28 },
  md: { width: 160, height: 36 },
  lg: { width: 220, height: 50 },
}

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  const { width, height } = sizes[size]

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="leadsolution."
        width={width}
        height={height}
        className="h-auto dark:invert"
        priority
      />
      {showText && (
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          Dein Vertriebssystem für planbare Termine
        </span>
      )}
    </div>
  )
}

/** Compact icon-only version for collapsed sidebar */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <span className="text-lg font-black tracking-tighter">ls<span className="text-purple-400">.</span></span>
    </div>
  )
}
