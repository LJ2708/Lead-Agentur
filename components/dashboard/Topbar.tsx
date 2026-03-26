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
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";

interface TopbarUser {
  email: string;
  full_name: string;
  role: string;
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left side - can be used for breadcrumbs later */}
      <div />

      {/* Right side - user menu */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-xs capitalize">
          {roleLabelMap[user.role] ?? user.role}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="default" className="gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200">
                <UserIcon className="h-4 w-4 text-gray-600" />
              </div>
              <span className="max-w-[150px] truncate text-sm font-medium text-gray-700">
                {user.full_name}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
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
