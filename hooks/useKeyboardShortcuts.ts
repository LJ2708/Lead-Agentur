"use client";

import { useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShortcutAction {
  /** Human-readable key combo, e.g. "cmd+k" */
  keys: string;
  /** German description for HelpCenter */
  description: string;
  /** Callback to execute */
  handler: () => void;
  /** Only trigger when this condition is true */
  when?: () => boolean;
}

interface UseKeyboardShortcutsOptions {
  /** All registered shortcuts */
  shortcuts: ShortcutAction[];
  /** Whether shortcuts are currently enabled */
  enabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((active as HTMLElement).contentEditable === "true") return true;
  return false;
}

function matchesShortcut(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.toLowerCase().split("+").map((p) => p.trim());

  const needsMeta = parts.includes("cmd") || parts.includes("meta");
  const needsCtrl = parts.includes("ctrl");
  const needsShift = parts.includes("shift");
  const needsAlt = parts.includes("alt");

  // The actual key is the last non-modifier part
  const modifiers = new Set(["cmd", "meta", "ctrl", "shift", "alt"]);
  const keyParts = parts.filter((p) => !modifiers.has(p));
  const targetKey = keyParts[keyParts.length - 1];

  if (!targetKey) return false;

  // Check modifiers
  const metaOrCtrl = e.metaKey || e.ctrlKey;
  if (needsMeta && !metaOrCtrl) return false;
  if (needsCtrl && !e.ctrlKey) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsAlt && !e.altKey) return false;

  // If no modifiers required, make sure none are pressed (except for single-key shortcuts)
  if (!needsMeta && !needsCtrl && (e.metaKey || e.ctrlKey)) return false;

  // Check key
  const pressedKey = e.key.toLowerCase();
  if (targetKey === "escape") return pressedKey === "escape";
  if (targetKey === "enter") return pressedKey === "enter";

  return pressedKey === targetKey;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        if (!matchesShortcut(e, shortcut.keys)) continue;

        // For single-key shortcuts (no modifiers), skip if input is focused
        const parts = shortcut.keys.toLowerCase().split("+").map((p) => p.trim());
        const hasModifier = parts.some((p) =>
          ["cmd", "meta", "ctrl", "shift", "alt"].includes(p)
        );
        if (!hasModifier && shortcut.keys.toLowerCase() !== "escape" && isInputFocused()) {
          continue;
        }

        // Check conditional
        if (shortcut.when && !shortcut.when()) continue;

        e.preventDefault();
        shortcut.handler();
        return;
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// ---------------------------------------------------------------------------
// Default shortcuts list (for HelpCenter)
// ---------------------------------------------------------------------------

export const SHORTCUT_DESCRIPTIONS = [
  { keys: "\u2318K", description: "Suche öffnen" },
  { keys: "\u2318N", description: "Neuer Lead (Admin)" },
  { keys: "\u2318\u21E7L", description: "Zu Leads navigieren" },
  { keys: "\u2318\u21E7B", description: "Zu Berater navigieren" },
  { keys: "Esc", description: "Modals schließen" },
  { keys: "N", description: "Schnelle Notiz (Lead-Detail)" },
  { keys: "C", description: "Schneller Anruf (Lead-Detail)" },
];
