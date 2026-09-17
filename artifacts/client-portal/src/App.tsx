import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  Show,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import {
  Switch,
  Route,
  useLocation,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { basePath, isStaff } from "@/lib/utils";
import { track } from "@/lib/track";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";

import DashboardPage from "@/pages/dashboard";
import BusinessProfilePage from "@/pages/business";
import CoursesPage from "@/pages/courses";
import CoursePlayerPage from "@/pages/course-player";
import ProjectsPage from "@/pages/projects";
import ProjectDetailPage from "@/pages/project-detail";
import ProfileSettingsPage from "@/pages/settings-profile";
import BillingSettingsPage from "@/pages/settings-billing";
import AdminHomePage from "@/pages/admin-home";
import AdminUsersPage from "@/pages/admin-users";
import AdminUserDetailPage from "@/pages/admin-user-detail";
import AdminCoursesPage from "@/pages/admin-courses";
import AdminCourseEditPage from "@/pages/admin-course-edit";
import AdminTeamPage from "@/pages/admin-team";
import AdminSupportPage from "@/pages/admin-support";
import Upsell1Page from "@/pages/upsell-1";
import Upsell2Page from "@/pages/upsell-2";
import ExtraPagesPage from "@/pages/extra-pages";
import SupportPage from "@/pages/support";
import NotFound from "@/pages/not-found";
import ProductPreviewPage from "@/pages/product-preview";
import WebsitePrototypePage from "@/pages/website-prototype";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { AppShell } from "@/components/AppShell";
import { AdminOnly, StaffOnly } from "@/components/RoleGate";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <AccessLanding />
      </Show>
    </>
  );
}

function AccessLanding() {
  return (
    <div className="portal-noise grid min-h-[100dvh] place-items-center bg-sidebar px-5 text-sidebar-foreground">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-black italic text-primary-foreground">F</div>
        <div className="mt-6 text-[10px] font-bold uppercase tracking-[.25em] text-primary">Fitness Toolkit customer portal</div>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-.05em] sm:text-6xl">Your purchased tools, in one secure place.</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-sidebar-foreground/60">Access is created after a verified purchase. Use the email address linked to your order to sign in or recover your account.</p>
        <a href={`${basePath}/sign-in`} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-[0_14px_40px_rgba(239,22,47,.28)]">Sign in to my account <ArrowRight className="h-4 w-4" /></a>
        <p className="mt-5 text-xs text-sidebar-foreground/40">There is no public registration. Customer access is issued after purchase.</p>
      </div>
    </div>
  );
}

function WebsiteBuilderRoute() {
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { data: me } = useGetMe({
    query: { refetchOnMount: "always", queryKey: getGetMeQueryKey() },
  });

  return (
    <AppShell>
      <WebsitePrototypePage
        accountName={me?.user.name ?? "Your account"}
        accountEmail={me?.user.email ?? clerkUser?.primaryEmailAddress?.emailAddress}
        accountRole={me?.user.role}
        onSignOut={() => void signOut()}
      />
    </AppShell>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <PageViewTracker />
        {children}
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

const PRODUCT_CODES = {
  website: "fitness-website-core",
  extraPages: "fitness-extra-pages",
  campaignStudio: "fitness-campaign-studio",
  metaAds: "fitness-meta-ads",
} as const;

function ProductGate({ productCode, productName, children }: { productCode: string; productName: string; children: React.ReactNode }) {
  const { data, isLoading } = useGetMe();
  if (isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-background text-sm text-muted-foreground">Checking account access…</div>;
  if (data && (isStaff(data.user.role) || data.entitlements.includes(productCode))) return <>{children}</>;
  return (
    <AppShell>
      <div className="grid min-h-[70dvh] place-items-center px-5 py-12">
        <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-5 font-display text-3xl font-semibold">Purchase access required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{productName} is not active on this account. Sign in with the email used at checkout, or contact support if you have already purchased it.</p>
          <a href={`${basePath}/support`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">Get access help <ArrowRight className="h-4 w-4" /></a>
        </div>
      </div>
    </AppShell>
  );
}

function PageViewTracker() {
  const [path] = useLocation();
  useEffect(() => {
    track("viewed_page", {
      target: typeof document !== "undefined" ? document.title : path,
      path,
    });
  }, [path]);
  return null;
}

function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} /></AuthFrame>;
}

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-noise grid min-h-[100dvh] bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-[440px] w-[440px] rounded-full border-[44px] border-primary/20" />
        <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full border-[34px] border-accent/10" />
        <div className="relative"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">F</div><div><div className="text-sm font-bold tracking-[.14em]">FITNESS TOOLKIT</div><div className="text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/45">Customer workspace</div></div></div></div>
        <div className="relative max-w-lg pb-8"><div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><Activity className="h-4 w-4" /> Welcome to the platform</div><h1 className="font-display text-6xl font-semibold leading-[.95] tracking-[-.06em]">Make the next move count.</h1><p className="mt-6 max-w-md text-base leading-7 text-sidebar-foreground/65">Build your online presence and run a business you are proud of.</p><div className="mt-8 flex items-center gap-3 text-sm text-sidebar-foreground/55"><ShieldCheck className="h-4 w-4 text-accent" /> A clear place for your business growth</div></div>
        <div className="relative flex items-center gap-2 text-xs text-sidebar-foreground/40">Fitness Toolkit Portal <ArrowRight className="h-3.5 w-3.5" /> Start where you are</div>
      </div>
        <div className="flex min-h-[100dvh] items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-[440px]"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">F</div><span className="text-sm font-bold tracking-[.14em]">FITNESS TOOLKIT</span></div><div className="mb-6"><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">Secure customer access</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em]">Pick up where you left off.</h2><p className="mt-2 text-sm text-muted-foreground">Use your purchase email. New accounts are issued after checkout.</p></div>{children}</div></div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) {
        qc.clear();
      }
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to continue your work",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/preview/*?"><Redirect to="/sign-in" /></Route>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?"><Redirect to="/sign-in" /></Route>

            <Route path="/dashboard">
              <Protected><DashboardPage /></Protected>
            </Route>
            <Route path="/business">
              <Protected><BusinessProfilePage /></Protected>
            </Route>
            <Route path="/website">
              <Protected><ProductGate productCode={PRODUCT_CODES.website} productName="Personalised Website"><WebsiteBuilderRoute /></ProductGate></Protected>
            </Route>
            <Route path="/comeback/*?">
              <Redirect to="/website" />
            </Route>
            <Route path="/courses">
              <Protected><CoursesPage /></Protected>
            </Route>
            <Route path="/courses/:courseId">
              {(p) => (
                <Protected><CoursePlayerPage courseId={p.courseId!} /></Protected>
              )}
            </Route>
            <Route path="/projects">
              <Protected><ProjectsPage /></Protected>
            </Route>
            <Route path="/projects/:projectId">
              {(p) => (
                <Protected><ProjectDetailPage projectId={p.projectId!} /></Protected>
              )}
            </Route>
            <Route path="/settings/profile">
              <Protected><ProfileSettingsPage /></Protected>
            </Route>
            <Route path="/settings/billing">
              <Protected><BillingSettingsPage /></Protected>
            </Route>
            <Route path="/settings">
              <Redirect to="/settings/profile" />
            </Route>

            <Route path="/admin">
              <Protected><AdminOnly><AdminHomePage /></AdminOnly></Protected>
            </Route>
            <Route path="/admin/users">
              <Protected><AdminOnly><AdminUsersPage /></AdminOnly></Protected>
            </Route>
            <Route path="/admin/users/:userId">
              {(p) => (
                <Protected><AdminOnly><AdminUserDetailPage userId={p.userId!} /></AdminOnly></Protected>
              )}
            </Route>
            <Route path="/admin/courses">
              <Protected><AdminOnly><AdminCoursesPage /></AdminOnly></Protected>
            </Route>
            <Route path="/admin/courses/:courseId/edit">
              {(p) => (
                <Protected><AdminOnly><AdminCourseEditPage courseId={p.courseId!} /></AdminOnly></Protected>
              )}
            </Route>
            <Route path="/admin/courses/:courseId">
              {(p) => (
                <Protected><AdminOnly><AdminCourseEditPage courseId={p.courseId!} /></AdminOnly></Protected>
              )}
            </Route>
            <Route path="/admin/team">
              <Protected><AdminOnly><AdminTeamPage /></AdminOnly></Protected>
            </Route>
            <Route path="/admin/support">
              <Protected><StaffOnly><AdminSupportPage /></StaffOnly></Protected>
            </Route>

            <Route path="/upsell-1">
              <Protected><ProductGate productCode={PRODUCT_CODES.campaignStudio} productName="Campaign Studio"><Upsell1Page /></ProductGate></Protected>
            </Route>
            <Route path="/upsell-2">
              <Protected><ProductGate productCode={PRODUCT_CODES.metaAds} productName="Meta Ad Launch Pack"><Upsell2Page /></ProductGate></Protected>
            </Route>
            <Route path="/extra-pages">
              <Protected><ProductGate productCode={PRODUCT_CODES.extraPages} productName="Extra Pages"><ExtraPagesPage /></ProductGate></Protected>
            </Route>
            <Route path="/campaign-studio">
              <Protected><ProductGate productCode={PRODUCT_CODES.campaignStudio} productName="Campaign Studio"><Upsell1Page /></ProductGate></Protected>
            </Route>
            <Route path="/meta-ads">
              <Protected><ProductGate productCode={PRODUCT_CODES.metaAds} productName="Meta Ad Launch Pack"><Upsell2Page /></ProductGate></Protected>
            </Route>
            <Route path="/support">
              <Protected><SupportPage /></Protected>
            </Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
