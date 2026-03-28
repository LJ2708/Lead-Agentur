"use client"

import { cn } from "@/lib/utils"

interface SafeAreaWrapperProps {
  children: React.ReactNode
  className?: string
}

export function SafeAreaWrapper({ children, className }: SafeAreaWrapperProps) {
  return (
    <div
      className={cn("safe-area-top safe-area-bottom", className)}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      {children}
    </div>
  )
}
