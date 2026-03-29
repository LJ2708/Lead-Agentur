"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSidebarContext } from "@/components/dashboard/MobileLayout";
import {
  LayoutDashboard,
  UserCheck,
  SlidersHorizontal,
  ShoppingCart,
  Wallet,
  GitBranch,
  Activity,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Headphones,
  PieChart,
  ScrollText,
  Calendar,
  Globe,
  Server,
  MailOpen,
  RefreshCw,
  Bell,
  Code,
  UserCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Role = "admin" | "teamleiter" | "setter" | "berater";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItemsByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Leads", href: "/admin/leads", icon: FileText },
    { label: "Berater", href: "/admin/berater", icon: UserCheck },
    { label: "Setter", href: "/admin/setter", icon: Headphones },
    { label: "Pricing", href: "/admin/pricing", icon: SlidersHorizontal },
    { label: "Nachkauf", href: "/admin/nachkauf", icon: ShoppingCart },
    { label: "Budget", href: "/admin/budget", icon: Wallet },
    { label: "Routing", href: "/admin/routing", icon: GitBranch },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Aktivit\u00e4ten", href: "/admin/activity", icon: Activity },
    { label: "Analytics", href: "/admin/analytics", icon: PieChart },
    { label: "Performance", href: "/admin/performance", icon: Trophy },
    { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
    { label: "Webhooks", href: "/admin/webhooks", icon: Globe },
    { label: "Templates", href: "/admin/templates", icon: MailOpen },
    { label: "Automation", href: "/admin/automation", icon: RefreshCw },
    { label: "API Docs", href: "/admin/api-docs", icon: Code },
    { label: "System", href: "/admin/system", icon: Server },
    { label: "Benachrichtigungen", href: "/notifications", icon: Bell },
    { label: "Einstellungen", href: "/admin/settings", icon: Settings },
  ],
  teamleiter: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Leads", href: "/admin/leads", icon: FileText },
    { label: "Berater", href: "/admin/berater", icon: UserCheck },
    { label: "Pricing", href: "/admin/pricing", icon: SlidersHorizontal },
    { label: "Nachkauf", href: "/admin/nachkauf", icon: ShoppingCart },
    { label: "Budget", href: "/admin/budget", icon: Wallet },
    { label: "Routing", href: "/admin/routing", icon: GitBranch },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Benachrichtigungen", href: "/notifications", icon: Bell },
  ],
  berater: [
    { label: "Overview", href: "/berater", icon: LayoutDashboard },
    { label: "Meine Leads", href: "/berater/leads", icon: FileText },
    { label: "Kalender", href: "/berater/kalender", icon: Calendar },
    { label: "Nachkauf", href: "/berater/nachkauf", icon: ShoppingCart },
    { label: "Mein Profil", href: "/berater/profil", icon: UserCircle },
    { label: "Benachrichtigungen", href: "/notifications", icon: Bell },
    { label: "Einstellungen", href: "/berater/settings", icon: Settings },
  ],
  setter: [
    { label: "Arbeitsliste", href: "/setter", icon: Headphones },
    { label: "Meine Statistiken", href: "/setter/stats", icon: BarChart3 },
    { label: "Benachrichtigungen", href: "/notifications", icon: Bell },
  ],
};

interface SidebarProps {
  role: Role;
}

function SidebarNav({
  navItems,
  showBadges,
  neuLeadsCount,
  collapsed,
  onItemClick,
}: {
  navItems: NavItem[];
  showBadges: boolean;
  neuLeadsCount: number;
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/admin" || href === "/berater" || href === "/setter") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <ul className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const badgeCount =
          showBadges && item.label === "Leads" ? neuLeadsCount : 0;

        if (collapsed) {
          return (
            <li key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    onClick={onItemClick}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-lg transition-colors",
                      active
                        ? "bg-blue-50 text-blue-600"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {badgeCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </li>
          );
        }

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onItemClick}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [neuLeadsCount, setNeuLeadsCount] = useState(0);
  const navItems = navItemsByRole[role] ?? [];
  const { isOpen, close } = useSidebarContext();

  const showBadges = role === "admin" || role === "teamleiter";

  const fetchNeuLeads = useCallback(async () => {
    if (!showBadges) return;
    const supabase = createClient();
    const { count } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "neu");
    setNeuLeadsCount(count ?? 0);
  }, [showBadges]);

  useEffect(() => {
    fetchNeuLeads();
    const interval = setInterval(fetchNeuLeads, 30_000);
    return () => clearInterval(interval);
  }, [fetchNeuLeads]);

  const brandLink = (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
        <span className="text-sm font-bold text-white">LS</span>
      </div>
      <span className="text-lg font-semibold text-foreground">LeadSolution</span>
    </Link>
  );

  return (
    <TooltipProvider>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-border bg-card transition-all duration-200 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-border px-4">
          {!collapsed && brandLink}
          {collapsed && (
            <Link href="/" className="mx-auto flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-sm font-bold text-white">LS</span>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4" role="navigation" aria-label="Hauptnavigation">
          <SidebarNav
            navItems={navItems}
            showBadges={showBadges}
            neuLeadsCount={neuLeadsCount}
            collapsed={collapsed}
          />
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "h-10 w-full text-muted-foreground hover:text-foreground",
              collapsed ? "justify-center" : "justify-end px-3"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center border-b border-border px-4">
            {brandLink}
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-4" role="navigation" aria-label="Hauptnavigation">
            <SidebarNav
              navItems={navItems}
              showBadges={showBadges}
              neuLeadsCount={neuLeadsCount}
              collapsed={false}
              onItemClick={close}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
