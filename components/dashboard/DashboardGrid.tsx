"use client"

import { useState, useEffect, useCallback, type ReactNode, type ReactElement } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardGridProps {
  children: ReactNode
  storageKey?: string
}

interface WidgetWrapperProps {
  title?: string
  children: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Widget Wrapper — consistent Card styling
// ---------------------------------------------------------------------------

export function WidgetWrapper({ title, children, className }: WidgetWrapperProps) {
  return (
    <Card className={cn("h-full", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={!title ? "pt-6" : undefined}>
        {children}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// DashboardGrid
// ---------------------------------------------------------------------------

export function DashboardGrid({
  children,
  storageKey = "dashboard-widget-order",
}: DashboardGridProps) {
  const childArray = Array.isArray(children)
    ? (children as ReactElement[])
    : children
      ? [children as ReactElement]
      : []

  const [order, setOrder] = useState<number[]>(() => {
    return childArray.map((_, i) => i)
  })

  // Load saved order from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as number[]
        // Validate: make sure all indices are present
        if (
          Array.isArray(parsed) &&
          parsed.length === childArray.length &&
          parsed.every((n) => typeof n === "number" && n >= 0 && n < childArray.length)
        ) {
          setOrder(parsed)
        }
      }
    } catch {
      // Ignore invalid saved state
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Save order to localStorage when it changes
  const saveOrder = useCallback(
    (newOrder: number[]) => {
      setOrder(newOrder)
      try {
        localStorage.setItem(storageKey, JSON.stringify(newOrder))
      } catch {
        // Storage full or unavailable
      }
    },
    [storageKey]
  )

  function moveUp(currentIndex: number) {
    if (currentIndex <= 0) return
    const newOrder = [...order]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex - 1]
    newOrder[currentIndex - 1] = temp
    saveOrder(newOrder)
  }

  function moveDown(currentIndex: number) {
    if (currentIndex >= order.length - 1) return
    const newOrder = [...order]
    const temp = newOrder[currentIndex]
    newOrder[currentIndex] = newOrder[currentIndex + 1]
    newOrder[currentIndex + 1] = temp
    saveOrder(newOrder)
  }

  if (childArray.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {order.map((childIndex, positionIndex) => {
        const child = childArray[childIndex]
        if (!child) return null

        return (
          <div key={childIndex} className="group relative">
            {/* Reorder controls — visible on hover */}
            <div className="absolute -left-1 top-2 z-10 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveUp(positionIndex)}
                disabled={positionIndex === 0}
                aria-label="Nach oben verschieben"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => moveDown(positionIndex)}
                disabled={positionIndex === order.length - 1}
                aria-label="Nach unten verschieben"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
            {child}
          </div>
        )
      })}
    </div>
  )
}
