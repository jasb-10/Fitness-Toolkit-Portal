import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  FileText,
  Home,
  LayoutTemplate,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { Logo } from "./Logo";
import { SupportWidget } from "./SupportWidget";
import { cn, initials, isAdmin, isStaff } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  note?: string;
  isLocked?: boolean;
}

const primaryNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "My Business", href: "/business", icon: BriefcaseBusiness },
  { label: "My Website", href: "/website", icon: Monitor },
];

const adminNav: NavItem[] = [
  { label: "Admin overview", href: "/admin", icon: ShieldCheck },
  { label: "Customers", href: "/admin/users", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: Wrench },
  { label: "Team", href: "/admin/team", icon: BriefcaseBusiness },
  { label: "Support", href: "/admin/support", icon: CircleHelp },
];

const upgradesNav: NavItem[] = [
  { label: "Extra Pages", href: "/extra-pages", icon: FileText, note: "Bump 1" },
];

const growthNav: NavItem[] = [];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [loc] = useLocation();
  const active = loc === item.href || (item.href !== "/dashboard" && loc.startsWith(item.href));
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all duration-200",
        active
          ? "bg-primary font-semibold text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.2)]"
          : "text-sidebar-foreground/70 hover:bg-white/[.06] hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {item.note && (
          <span className="block text-[9px] uppercase tracking-wider text-sidebar-foreground/40 mt-0.5">
            {item.note}
          </span>
        )}
      </span>
      {item.isLocked && <Lock className="h-3.5 w-3.5 opacity-50" />}
    </Link>
  );
}

function SidePanel({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const { signOut, openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: me, isLoading } = useGetMe();
  const role = me?.user.role;
  const showAdmin = isStaff(role);

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-sidebar-foreground",
      mobile ? "min-h-[100dvh] w-[min(88vw,340px)] border-r border-sidebar-border" : "sticky top-0 hidden h-[100dvh] w-[278px] shrink-0 border-r border-sidebar-border lg:flex",
    )}>
      <div className="flex items-center justify-between px-7 py-7 border-b border-sidebar-border/50">
        <Link href="/dashboard" onClick={close} className="flex items-center gap-3 text-left">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-black italic text-primary-foreground">F</div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">FITNESS</div>
            <div className="text-[10px] tracking-[.32em] text-sidebar-foreground/65">TOOLKIT</div>
          </div>
        </Link>
        {mobile && (
          <button type="button" aria-label="Close navigation" onClick={close} className="rounded-lg p-2 text-sidebar-foreground/65 hover:bg-white/10 hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-1">
          {primaryNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
        </div>

        {showAdmin && (
          <>
            <div className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.24em] text-primary">Admin workspace</div>
            <div className="space-y-1 rounded-2xl border border-primary/20 bg-primary/[.06] p-1.5">
              {adminNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
            </div>
          </>
        )}
        
        <div className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.24em] text-sidebar-foreground/35">Your upgrades</div>
        <div className="space-y-1">
          {upgradesNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
        </div>
        
        <div className="px-3 pb-2 pt-6 text-[9px] font-bold uppercase tracking-[.24em] text-sidebar-foreground/35">Growth tools</div>
        <div className="space-y-1">
          {growthNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 space-y-1">
          <NavLink item={{ label: "Help", href: "/support", icon: CircleHelp }} onNavigate={close} />
        </div>
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <Link href="/settings/profile" onClick={close} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-sidebar-foreground/65 hover:bg-white/[.06] hover:text-sidebar-foreground transition-colors">
          <Settings className="h-4 w-4" />
          <span className="flex-1">Settings</span>
        </Link>
        
        {isLoading ? (
          <div className="flex items-center gap-3 px-4 py-3"><Skeleton className="h-4 w-4 bg-sidebar-accent" /><Skeleton className="h-4 w-24 bg-sidebar-accent" /></div>
        ) : (
          <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-sidebar-foreground/65 hover:bg-white/[.06] hover:text-sidebar-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="min-w-0 flex-1 truncate">Log out{me?.user.name ? ` · ${me.user.name}` : ""}</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <SidePanel />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-foreground/35 backdrop-blur-sm" />
          <div className="relative z-10"><SidePanel mobile close={() => setMobileOpen(false)} /></div>
        </div>
      )}
      <main className="min-w-0 flex-1 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-black italic">F</span>
            <span className="text-xs font-extrabold tracking-[.14em]">FITNESS TOOLKIT</span>
          </Link>
          <div className="w-10" />
        </header>
        <div className="flex-1">
          {children}
        </div>
      </main>
      <SupportWidget />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="border-b border-border bg-card px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{eyebrow}</div>}
          <h1 className="text-balance font-display text-4xl font-semibold leading-[1] tracking-[-.045em] text-foreground sm:text-5xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}