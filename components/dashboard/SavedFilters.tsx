"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Bookmark, Trash2, Save, ChevronDown } from "lucide-react"

interface FilterValues {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  [key: string]: string | undefined
}

interface SavedFilter {
  id: string
  name: string
  filters: FilterValues
  isDefault?: boolean
}

interface SavedFiltersProps {
  currentFilters: FilterValues
  onApply: (filters: FilterValues) => void
}

const STORAGE_KEY = "leadsolution_saved_filters"

function getMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(now.getFullYear(), now.getMonth(), diff)
    .toISOString()
    .split("T")[0]
}

function getSunday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? 0 : 7)
  return new Date(now.getFullYear(), now.getMonth(), diff)
    .toISOString()
    .split("T")[0]
}

const DEFAULT_FILTERS: SavedFilter[] = [
  {
    id: "default_neue",
    name: "Neue Leads",
    filters: { status: "neu" },
    isDefault: true,
  },
  {
    id: "default_meine_offen",
    name: "Meine offenen",
    filters: { status: "zugewiesen" },
    isDefault: true,
  },
  {
    id: "default_sla",
    name: "SLA aktiv",
    filters: { status: "kontaktversuch" },
    isDefault: true,
  },
  {
    id: "default_diese_woche",
    name: "Diese Woche",
    filters: {
      dateFrom: getMonday(),
      dateTo: getSunday(),
    },
    isDefault: true,
  },
]

function loadSavedFilters(): SavedFilter[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as SavedFilter[]) : []
  } catch {
    return []
  }
}

function persistFilters(filters: SavedFilter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // ignore quota errors
  }
}

export function SavedFilters({ currentFilters, onApply }: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState("")

  useEffect(() => {
    setSavedFilters(loadSavedFilters())
  }, [])

  function handleSave() {
    const name = filterName.trim()
    if (!name) return

    const newFilter: SavedFilter = {
      id: `custom_${Date.now()}`,
      name,
      filters: { ...currentFilters },
    }

    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    persistFilters(updated)
    setFilterName("")
    setSaveDialogOpen(false)
  }

  function handleDelete(id: string) {
    const updated = savedFilters.filter((f) => f.id !== id)
    setSavedFilters(updated)
    persistFilters(updated)
  }

  function handleApply(filter: SavedFilter) {
    onApply(filter.filters)
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Bookmark className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gespeicherte Filter</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {DEFAULT_FILTERS.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              onSelect={() => handleApply(filter)}
            >
              <span className="truncate">{filter.name}</span>
            </DropdownMenuItem>
          ))}
          {savedFilters.length > 0 && <DropdownMenuSeparator />}
          {savedFilters.map((filter) => (
            <DropdownMenuItem
              key={filter.id}
              className="flex items-center justify-between"
              onSelect={() => handleApply(filter)}
            >
              <span className="truncate">{filter.name}</span>
              <button
                type="button"
                className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(filter.id)
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => setSaveDialogOpen(true)}
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filter speichern</span>
      </Button>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Filter speichern</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Filtername..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!filterName.trim()}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
