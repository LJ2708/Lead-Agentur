"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Menu, Search, User as UserIcon } from "lucide-react";
import { AvailabilityToggle } from "@/components/dashboard/AvailabilityToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { useShortcuts } from "@/components/dashboard/ShortcutProvider";
import { HelpCenter } from "@/components/dashboard/HelpCenter";
import { useSidebarContext } from "@/components/dashboard/MobileLayout";

interface TopbarUser {
  id?: string;
  email: string;
  full_name: string;
  role: string;
  beraterId?: string;
}

interface TopbarProps {
  user: TopbarUser;
}

const roleLabelMap: Record<string, string> = {
  admin: "Admin",
  teamleiter: "Teamleiter",
  setter: "Setter",
  berater: "Berater",
};

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const { toggle } = useSidebarContext();
  const { openCommandPalette } = useShortcuts();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        {/* Left side - hamburger on mobile */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="md:hidden"
            aria-label="Menü öffnen"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right side - user menu */}
        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openCommandPalette()}
            className="hidden gap-2 text-muted-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Suche</span>
            <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openCommandPalette()}
            className="sm:hidden"
            aria-label="Suche öffnen"
          >
            <Search className="h-5 w-5" />
          </Button>
        {user.role === "berater" && user.beraterId && (
          <AvailabilityToggle beraterId={user.beraterId} compact />
        )}

        <ThemeToggle />

        <HelpCenter userId={user.id} />

        <NotificationBell />

        <Badge
          variant="secondary"
          className="hidden text-xs capitalize sm:inline-flex"
        >
          {roleLabelMap[user.role] ?? user.role}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="default" className="gap-1 md:gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="hidden max-w-[150px] truncate text-sm font-medium text-foreground sm:inline">
                {user.full_name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{user.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4" />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>
  );
}
