"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, X, FileText, ShoppingCart, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useShortcuts } from "@/components/dashboard/ShortcutProvider"

interface QuickActionsFABProps {
  role: "admin" | "teamleiter" | "setter" | "berater"
}

interface QuickAction {
  label: string
  icon: React.ReactNode
  action: () => void
}

export function QuickActionsFAB({ role }: QuickActionsFABProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { openCommandPalette } = useShortcuts()
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const actions: QuickAction[] = []

  if (role === "admin" || role === "teamleiter") {
    actions.push({
      label: "Neuer Lead",
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        router.push("/admin/leads/neu")
        setIsOpen(false)
      },
    })
  }

  if (role === "berater") {
    actions.push({
      label: "Leads nachkaufen",
      icon: <ShoppingCart className="h-4 w-4" />,
      action: () => {
        router.push("/berater/nachkauf")
        setIsOpen(false)
      },
    })
  }

  actions.push({
    label: "Suche",
    icon: <Search className="h-4 w-4" />,
    action: () => {
      openCommandPalette()
      setIsOpen(false)
    },
  })

  return (
    <div
      ref={containerRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2 md:hidden"
    >
      {/* Action buttons (shown when open) */}
      {isOpen &&
        actions.map((action) => (
          <div
            key={action.label}
            className="flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <span className="rounded-lg bg-card px-3 py-1.5 text-sm font-medium shadow-md">
              {action.label}
            </span>
            <Button
              size="icon"
              variant="secondary"
              className="h-10 w-10 rounded-full shadow-lg"
              onClick={action.action}
            >
              {action.icon}
            </Button>
          </div>
        ))}

      {/* Main FAB */}
      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-xl transition-transform duration-200",
          isOpen && "rotate-45"
        )}
        onClick={toggle}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  )
}
