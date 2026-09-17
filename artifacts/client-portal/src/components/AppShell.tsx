import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Home,
  LifeBuoy,
  LogOut,
  Menu,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
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
}

const primaryNav: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Learn", href: "/courses", icon: GraduationCap, note: "Library" },
  { label: "Projects", href: "/projects", icon: BriefcaseBusiness, note: "Done for you" },
  { label: "Comeback", href: "/comeback", icon: Sparkles, note: "Campaign builder" },
  { label: "Growth track", href: "/upsell-1", icon: Rocket, note: "Premium" },
  { label: "Support", href: "/support", icon: LifeBuoy },
];

const adminNavBase: NavItem[] = [
  { label: "Admin overview", href: "/admin", icon: ShieldCheck },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Team", href: "/admin/team", icon: UserCog },
];

const adminOnlyNav: NavItem[] = [{ label: "Support tools", href: "/admin/support", icon: LifeBuoy }];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [loc] = useLocation();
  const active = loc === item.href || (item.href !== "/dashboard" && loc.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(var(--primary)/.2)]"
          : "text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={active ? 2.1 : 1.7} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.note && (
        <span className={cn("hidden text-[10px] lg:block", active ? "text-primary-foreground/65" : "text-sidebar-foreground/38")}>
          {item.note}
        </span>
      )}
    </Link>
  );
}

function SidePanel({ mobile = false, close }: { mobile?: boolean; close?: () => void }) {
  const { signOut, openUserProfile } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: me, isLoading } = useGetMe();
  const role = me?.user.role;
  const showAdmin = isStaff(role);
  const adminNav = isAdmin(role) ? [...adminNavBase, ...adminOnlyNav] : adminNavBase;
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar text-sidebar-foreground",
      mobile ? "min-h-[100dvh] w-[min(88vw,340px)] border-r border-sidebar-border" : "sticky top-0 hidden h-[100dvh] w-[278px] shrink-0 border-r border-sidebar-border lg:flex",
    )}>
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
        <Link href="/dashboard" onClick={close} data-testid="link-logo-dashboard">
          <Logo />
        </Link>
        {mobile && (
          <button type="button" onClick={close} aria-label="Close navigation" data-testid="button-close-navigation" className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/70 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Activity className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[.18em] text-sidebar-foreground/45">Momentum score</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sidebar-foreground/15">
                <div className="h-full w-[72%] rounded-full bg-accent" />
              </div>
              <span className="text-xs font-semibold text-accent">72</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-sidebar-foreground/38">Workspace</div>
        <div className="space-y-1">
          {primaryNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
        </div>
        <div className="mb-3 mt-8 px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-sidebar-foreground/38">Account</div>
        <div className="space-y-1">
          <NavLink item={{ label: "Settings", href: "/settings/profile", icon: Settings }} onNavigate={close} />
        </div>
        {showAdmin && (
          <div className="mt-8 border-t border-sidebar-border pt-5">
            <button type="button" onClick={() => setAdminOpen((value) => !value)} data-testid="button-toggle-admin" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Wrench className="h-[17px] w-[17px]" />
              <span className="flex-1 text-left">Admin tools</span>
              {adminOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {adminOpen && (
              <div className="mt-1 space-y-1 border-l border-sidebar-border pl-2">
                {adminNav.map((item) => <NavLink key={item.href} item={item} onNavigate={close} />)}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        {isLoading ? (
          <div className="flex items-center gap-3 px-2 py-2"><Skeleton className="h-9 w-9 rounded-full bg-sidebar-accent" /><Skeleton className="h-4 w-24 bg-sidebar-accent" /></div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger data-testid="user-menu-trigger" className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-sidebar-accent">
              <Avatar className="h-9 w-9 border border-sidebar-foreground/15">
                <AvatarImage src={me?.user.avatarUrl ?? clerkUser?.imageUrl ?? undefined} />
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{initials(me?.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{me?.user.name ?? "Your account"}</div>
                <div className="truncate text-xs capitalize text-sidebar-foreground/45">{role?.replace("_", " ") ?? "Member"}</div>
              </div>
              <ChevronUp className="h-4 w-4 text-sidebar-foreground/45" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal"><div className="text-[11px] text-muted-foreground">Signed in as</div><div className="truncate text-sm">{me?.user.email}</div></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/settings/profile" onClick={close}>Profile settings</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/settings/billing" onClick={close}>Billing</Link></DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openUserProfile()}>Account & password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-testid="sign-out-button" onSelect={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="portal-noise flex min-h-[100dvh] w-full bg-background">
      <SidePanel />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button type="button" aria-label="Close navigation overlay" data-testid="button-close-navigation-overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-foreground/35 backdrop-blur-sm" />
          <div className="relative z-10"><SidePanel mobile close={() => setMobileOpen(false)} /></div>
        </div>
      )}
      <main className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-border bg-background/80 px-5 py-4 backdrop-blur lg:hidden">
          <button type="button" aria-label="Open navigation" data-testid="button-open-navigation" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="h-5 w-5" /></button>
          <Link href="/dashboard" data-testid="link-mobile-logo"><Logo /></Link>
          <Link href="/support" aria-label="Open support" data-testid="link-mobile-support" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LifeBuoy className="h-5 w-5" /></Link>
        </div>
        {children}
      </main>
      <SupportWidget />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="portal-grid border-b border-border px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.22em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{eyebrow}</div>}
          <h1 className="text-balance font-display text-4xl font-semibold leading-[.98] tracking-[-.045em] text-foreground sm:text-5xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
      </div>
    </header>
  );
}