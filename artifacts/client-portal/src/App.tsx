import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
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
import { basePath } from "@/lib/utils";
import { track } from "@/lib/track";
import { Activity, ArrowRight, ShieldCheck } from "lucide-react";

import DashboardPage from "@/pages/dashboard";
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
        <Redirect to="/website" />
      </Show>
      <Show when="signed-out">
        <WebsitePrototypePage />
      </Show>
    </>
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
  return <AuthFrame mode="sign-in"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return <AuthFrame mode="sign-up"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function AuthFrame({ mode, children }: { mode: "sign-in" | "sign-up"; children: React.ReactNode }) {
  return (
    <div className="portal-noise grid min-h-[100dvh] bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-[440px] w-[440px] rounded-full border-[44px] border-primary/20" />
        <div className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full border-[34px] border-accent/10" />
        <div className="relative"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">F</div><div><div className="text-sm font-bold tracking-[.14em]">FITNESS TOOLKIT</div><div className="text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/45">Member workspace</div></div></div></div>
        <div className="relative max-w-lg pb-8"><div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-accent"><Activity className="h-4 w-4" /> Progress, made visible</div><h1 className="font-display text-6xl font-semibold leading-[.95] tracking-[-.06em]">Make the next move count.</h1><p className="mt-6 max-w-md text-base leading-7 text-sidebar-foreground/65">Learn the work, keep the projects moving, and build a business you are proud to run.</p><div className="mt-8 flex items-center gap-3 text-sm text-sidebar-foreground/55"><ShieldCheck className="h-4 w-4 text-accent" /> A clear place for your business momentum</div></div>
        <div className="relative flex items-center gap-2 text-xs text-sidebar-foreground/40">Fitness Toolkit Portal <ArrowRight className="h-3.5 w-3.5" /> Start where you are</div>
      </div>
      <div className="flex min-h-[100dvh] items-center justify-center px-5 py-10 sm:px-8"><div className="w-full max-w-[440px]"><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">F</div><span className="text-sm font-bold tracking-[.14em]">FITNESS TOOLKIT</span></div><div className="mb-6"><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-primary">{mode === "sign-in" ? "Welcome back" : "Your workspace starts here"}</div><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-.04em]">{mode === "sign-in" ? "Pick up where you left off." : "Build your momentum."}</h2></div>{children}</div></div>
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
  // The design preview is intentionally usable before account and API setup.
  if (window.location.pathname.startsWith("/preview")) return <WebsitePrototypePage />;
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to continue your work",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Begin where you left off",
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
            <Route path="/preview/*?" component={WebsitePrototypePage} />
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route path="/dashboard">
              <Protected><DashboardPage /></Protected>
            </Route>
            <Route path="/website">
              <Protected><WebsitePrototypePage /></Protected>
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
              <Protected><AdminHomePage /></Protected>
            </Route>
            <Route path="/admin/users">
              <Protected><AdminUsersPage /></Protected>
            </Route>
            <Route path="/admin/users/:userId">
              {(p) => (
                <Protected><AdminUserDetailPage userId={p.userId!} /></Protected>
              )}
            </Route>
            <Route path="/admin/courses">
              <Protected><AdminCoursesPage /></Protected>
            </Route>
            <Route path="/admin/courses/:courseId/edit">
              {(p) => (
                <Protected><AdminCourseEditPage courseId={p.courseId!} /></Protected>
              )}
            </Route>
            <Route path="/admin/courses/:courseId">
              {(p) => (
                <Protected><AdminCourseEditPage courseId={p.courseId!} /></Protected>
              )}
            </Route>
            <Route path="/admin/team">
              <Protected><AdminTeamPage /></Protected>
            </Route>
            <Route path="/admin/support">
              <Protected><AdminSupportPage /></Protected>
            </Route>

            <Route path="/upsell-1">
              <Protected><Upsell1Page /></Protected>
            </Route>
            <Route path="/upsell-2">
              <Protected><Upsell2Page /></Protected>
            </Route>
            <Route path="/extra-pages">
              <Protected><ExtraPagesPage /></Protected>
            </Route>
            <Route path="/campaign-studio">
              <Protected><Upsell1Page /></Protected>
            </Route>
            <Route path="/meta-ads">
              <Protected><Upsell2Page /></Protected>
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
