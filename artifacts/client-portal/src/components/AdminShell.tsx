import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { Logo } from "./Logo";
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
  icon: typeof LayoutDashboard;
}

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "GHL fulfilment", href: "/admin/ghl", icon: Webhook },
  { label: "Members", href: "/admin/users", icon: Users },
  { label: "Team", href: "/admin/team", icon: UserCog },
];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [loc] = useLocation();
  const active = loc === item.href || (item.href !== "/admin" && loc.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function SidePanel({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const { signOut, openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: me, isLoading } = useGetMe();
  const role = me?.user.role;

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-sidebar-foreground",
      mobile ? "min-h-[100dvh] w-[min(88vw,340px)] border-r border-sidebar-border" : "sticky top-0 hidden h-[100dvh] w-[278px] shrink-0 border-r border-sidebar-border lg:flex",
    )}>
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <Link href="/admin" onClick={close}>
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-black italic">
              F
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">FITNESS</div>
              <div className="text-[10px] tracking-[.32em] text-primary/80">OWNER</div>
            </div>
          </div>
        </Link>
        {mobile && (
          <button type="button" onClick={close} aria-label="Close navigation" className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-sidebar-foreground/40">Owner Workspace</div>
        <div className="space-y-1">
          {adminNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
        </div>
      </nav>

      <div className="px-4 pb-4">
        <Link 
          href="/dashboard" 
          onClick={close} 
          className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-4 py-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customer portal
        </Link>
      </div>

      <div className="border-t border-sidebar-border p-4">
        {isLoading ? (
          <div className="flex items-center gap-3 px-2 py-2"><Skeleton className="h-9 w-9 rounded-full bg-sidebar-accent" /><Skeleton className="h-4 w-24 bg-sidebar-accent" /></div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9 border border-sidebar-foreground/15">
                <AvatarImage src={me?.user.avatarUrl ?? clerkUser?.imageUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(me?.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{me?.user.name ?? "Your account"}</div>
                <div className="truncate text-xs capitalize text-sidebar-foreground/50">{role?.replace("_", " ") ?? "Owner"}</div>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal"><div className="text-[11px] text-muted-foreground">Signed in as</div><div className="truncate text-sm">{me?.user.email}</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/settings/profile" onClick={close}>Profile settings</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openUserProfile()}>Account & password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <SidePanel />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="relative z-10"><SidePanel mobile close={() => setMobileOpen(false)} /></div>
        </div>
      )}
      <main className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center justify-between border-b border-border bg-background/80 px-5 py-4 backdrop-blur lg:hidden sticky top-0 z-20">
          <button type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-black italic">
              F
            </div>
          </div>
          <div className="w-9" />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="border-b border-border bg-card px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-primary">{eyebrow}</div>}
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1] tracking-[-.03em] text-foreground sm:text-4xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}
