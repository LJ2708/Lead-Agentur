"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
})

export function useSidebarContext() {
  return useContext(SidebarContext)
}

interface MobileLayoutProps {
  sidebar: ReactNode
  topbar: ReactNode
  children: ReactNode
}

export function MobileLayout({ sidebar, topbar, children }: MobileLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Desktop sidebar */}
        <div className="hidden md:block">{sidebar}</div>

        {/* Mobile sidebar is handled inside the Sidebar component via Sheet */}
        <div className="md:hidden">{/* Sheet rendered by Sidebar */}</div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {topbar}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
