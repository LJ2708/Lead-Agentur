"use client";

import { useCallback, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useKeyboardShortcuts, type ShortcutAction } from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/dashboard/CommandPalette";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ShortcutContextValue {
  openCommandPalette: () => void;
}

const ShortcutContext = createContext<ShortcutContextValue>({
  openCommandPalette: () => {},
});

export function useShortcuts() {
  return useContext(ShortcutContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ShortcutProviderProps {
  children: React.ReactNode;
  role: "admin" | "teamleiter" | "setter" | "berater";
}

export function ShortcutProvider({ children, role }: ShortcutProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const isLeadDetail =
    pathname.includes("/leads/") &&
    !pathname.endsWith("/leads") &&
    !pathname.endsWith("/leads/neu");

  const shortcuts: ShortcutAction[] = [
    {
      keys: "cmd+k",
      description: "Suche öffnen",
      handler: () => setCommandPaletteOpen((prev) => !prev),
    },
    {
      keys: "escape",
      description: "Modals schließen",
      handler: closeModals,
    },
    {
      keys: "cmd+shift+l",
      description: "Zu Leads navigieren",
      handler: () => {
        if (role === "admin" || role === "teamleiter") {
          router.push("/admin/leads");
        } else if (role === "berater") {
          router.push("/berater/leads");
        }
      },
    },
    {
      keys: "cmd+shift+b",
      description: "Zu Berater navigieren",
      handler: () => {
        if (role === "admin" || role === "teamleiter") {
          router.push("/admin/berater");
        }
      },
      when: () => role === "admin" || role === "teamleiter",
    },
    {
      keys: "cmd+n",
      description: "Neuer Lead (Admin)",
      handler: () => router.push("/admin/leads/neu"),
      when: () => role === "admin" || role === "teamleiter",
    },
    {
      keys: "n",
      description: "Schnelle Notiz (Lead-Detail)",
      handler: () => {
        // Focus the note textarea if on lead detail page
        const textarea = document.querySelector<HTMLTextAreaElement>(
          'textarea[placeholder*="Notiz"]'
        );
        textarea?.focus();
      },
      when: () => isLeadDetail,
    },
    {
      keys: "c",
      description: "Schneller Anruf (Lead-Detail)",
      handler: () => {
        // Click the phone link if on lead detail page
        const phoneLink = document.querySelector<HTMLAnchorElement>(
          'a[href^="tel:"]'
        );
        phoneLink?.click();
      },
      when: () => isLeadDetail,
    },
  ];

  return (
    <ShortcutContext.Provider value={{ openCommandPalette }}>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <ShortcutKeyboardListener shortcuts={shortcuts} />
      {children}
    </ShortcutContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Separate component to keep hook call stable
// ---------------------------------------------------------------------------

function ShortcutKeyboardListener({
  shortcuts,
}: {
  shortcuts: ShortcutAction[];
}) {
  useKeyboardShortcuts({ shortcuts, enabled: true });
  return null;
}
