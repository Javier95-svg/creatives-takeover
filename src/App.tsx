import { Suspense, lazy, useEffect, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { UpgradePromptProvider } from "@/contexts/UpgradePromptContext";
import { CreditGateProvider } from "@/contexts/CreditGateContext";
import CreditStatusBanner from "@/components/CreditStatusBanner";
import MobileOptimization from "@/components/MobileOptimization";
import VersionUpdateBanner from "@/components/VersionUpdateBanner";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { shouldShowPulseForPath } from "@/config/pulseRoutes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import ScrollToTop from "./components/ScrollToTop";
import ProUpgradeBanner from "@/components/ProUpgradeBanner";
import AdminRoute from "@/components/AdminRoute";
import { useInteractionTelemetry } from "@/hooks/useInteractionTelemetry";
import { captureReferralFromUrl } from "@/lib/referral";

const PulseWidget = lazy(() => import("@/components/pulse/PulseWidget"));
const MobileBottomNav = lazy(() =>
  import("@/components/mobile/MobileBottomNav").then((module) => ({
    default: module.MobileBottomNav,
  }))
);
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((module) => ({
    default: module.Analytics,
  }))
);

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const Contact = lazy(() => import("./pages/Contact"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const Resources = lazy(() => import("./pages/Resources"));
const FounderAnswerLibrary = lazy(() => import("./pages/FounderAnswerLibrary"));
const FounderAnswerPage = lazy(() => import("./pages/FounderAnswerPage"));
const StartupGuide = lazy(() => import("./pages/StartupGuide"));
const Services = lazy(() => import("./pages/Services"));
const Software = lazy(() => import("./pages/Software"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const ProgressCommunityPage = lazy(() => import("./pages/ProgressCommunityPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Careers = lazy(() => import("./pages/Careers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataPrivacy = lazy(() => import("./pages/DataPrivacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const IPPolicy = lazy(() => import("./pages/IPPolicy"));
const Signup = lazy(() => import("./pages/Signup"));
const Dream2Plan = lazy(() => import("./pages/Dream2Plan"));
const BizMapJourneyHubPage = lazy(() => import("./pages/BizMapJourneyHubPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const Login = lazy(() => import("./pages/Login"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardShell = lazy(() => import("./components/dashboard/DashboardShell"));
const SavedMentorsPage = lazy(() => import("./pages/SavedMentorsPage"));
const Accountability = lazy(() => import("./pages/Accountability"));
const Blog = lazy(() => import("./pages/Blog"));
const VCSearchPage = lazy(() => import("./pages/VCSearchPage"));
const EmailTemplatesPage = lazy(() => import("./pages/EmailTemplatesPage"));
const AcceleratorHuntPage = lazy(() => import("./pages/AcceleratorHuntPage"));
const InsightaTestPage = lazy(() => import("./pages/InsightaTestPage"));
const Stories = lazy(() => import("./pages/Stories"));
const StoryArticle = lazy(() => import("./pages/StoryArticle"));
const StoryTagPage = lazy(() => import("./pages/StoryTagPage"));
const AdminStoryEditor = lazy(() => import("./pages/AdminStoryEditor"));
const AdminHeroImages = lazy(() => import("./pages/AdminHeroImages"));
const StoriesRSS = lazy(() => import("./pages/StoriesRSS"));
const WaitlistPublicPage = lazy(() => import("./pages/WaitlistPublicPage"));
const AdminVCManagement = lazy(() => import("./pages/AdminVCManagement"));
const AdminAcceleratorManagement = lazy(() => import("./pages/AdminAcceleratorManagement"));

const Demo = lazy(() => import("./pages/Demo"));
const Profile = lazy(() => import("./pages/Profile"));
const Account = lazy(() => import("./pages/Account"));
const SetupQuiz = lazy(() => import("./pages/SetupQuiz"));
const Messages = lazy(() => import("./pages/Messages"));
const CreativesTakeover = lazy(() => import("./pages/CreativesTakeover"));
const RAGTest = lazy(() => import("./pages/RAGTest"));
const TestPhase1 = lazy(() => import("./pages/TestPhase1"));
const MentorProfilePage = lazy(() => import("./pages/community/MentorProfilePage"));
const FindCoFounder = lazy(() => import("./pages/community/FindCoFounder"));
const CreateCoFounderPost = lazy(() => import("./pages/community/CreateCoFounderPost"));
const EditCoFounderPost = lazy(() => import("./pages/community/EditCoFounderPost"));
const VCProfilePage = lazy(() => import("./components/vc/VCProfilePage"));
const AcceleratorProfilePage = lazy(() => import("./components/accelerator/AcceleratorProfilePage"));
const PitchDeckAnalyzerPage = lazy(() => import("./pages/PitchDeckAnalyzerPage"));
const MentorBookingPage = lazy(() => import("./pages/community/MentorBookingPage"));
const MyBookings = lazy(() => import("./pages/community/MyBookings"));
const AdminMentorEditor = lazy(() => import("./pages/community/AdminMentorEditor"));
const PMFLabPage = lazy(() => import("./pages/PMFLabPage"));
const ICPBuilderPage = lazy(() => import("./pages/IcpBuilderPage"));
const IcpDraftPage = lazy(() => import("./pages/IcpDraftPage"));
const IcpPublicDraftPage = lazy(() => import("./pages/IcpPublicDraftPage"));
const ValidateJourneyPage = lazy(() => import("./pages/ValidateJourneyPage"));
const TechStackPage = lazy(() => import("./pages/TechStackPage"));
const AppBuilderPage = lazy(() => import("./pages/AppBuilderPage"));
const GTMStrategistPage = lazy(() => import("./pages/GTMStrategistPage"));
const FocusFunnel = lazy(() => import("./pages/FocusFunnel"));
const FilesPage = lazy(() => import("./pages/FilesPage"));
const AiGoalsPage = lazy(() => import("./pages/AiGoalsPage"));
const CoreMetricsPage = lazy(() => import("./pages/CoreMetricsPage"));
const YourRoutinePage = lazy(() => import("./pages/YourRoutinePage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const ValidateJourney = lazy(() => import("./pages/journeys/ValidateJourney"));
const WaitlistMakerPage = lazy(() => import("./pages/WaitlistMakerPage"));
const WaitlistTemplatesPage = lazy(() => import("./pages/WaitlistTemplatesPage"));
const DirectoriesPage = lazy(() => import("./pages/DirectoriesPage"));
const FindYourAngel = lazy(() => import("./pages/community/FindYourAngel"));
const AdminAngelEditor = lazy(() => import("./pages/community/AdminAngelEditor"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));
const ReferralDashboardPage = lazy(() => import("./pages/ReferralDashboardPage"));
const DemoCalls = lazy(() => import("./pages/DemoCalls"));
const MVPBuilderBetaPage = lazy(() => import("./pages/MVPBuilderBetaPage"));
const BuildPage = lazy(() => import("./pages/BuildPage"));
const TractionEnginePage = lazy(() => import("./pages/TractionEnginePage"));
const ProjectsDashboard = lazy(() => import("./components/dashboard/ProjectsDashboard"));

// Demo Studio (interactive demo builder + public demo viewer)
const DemoStudioProjectsPage = lazy(() => import("./pages/demo-studio/ProjectsDashboardPage"));
const DemoStudioProjectOverviewPage = lazy(() => import("./pages/demo-studio/ProjectOverviewPage"));
const DemoStudioEditorPage = lazy(() => import("./pages/demo-studio/DemoEditorPage"));
const DemoStudioVslStudioPage = lazy(() => import("./pages/demo-studio/VslStudioPage"));
const DemoStudioLaunchComposerPage = lazy(() => import("./pages/demo-studio/LaunchComposerPage"));
const PublicDemoPage = lazy(() => import("./pages/demo-studio/PublicDemoPage"));
const EmbedDemoPage = lazy(() => import("./pages/demo-studio/EmbedDemoPage"));
const PublicLaunchPage = lazy(() => import("./pages/demo-studio/PublicLaunchPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 60 * 1000, // 1 minute
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const LegacyCommunityRedirect = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const nextPath = pathname.startsWith("/community/co-founders")
    ? pathname.replace("/community/co-founders", "/co-founder")
    : pathname.startsWith("/community/angels")
      ? pathname.replace("/community/angels", "/investors")
      : pathname.replace("/community", "/mentorship");

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
};

const PulseWidgetWrapper = () => {
  const location = useLocation();

  if (!shouldShowPulseForPath(location.pathname)) return null;

  return <PulseWidget />;
};

const InteractionTelemetryBridge = () => {
  useInteractionTelemetry();
  return null;
};

const ReferralCaptureBridge = () => {
  const location = useLocation();
  useEffect(() => {
    captureReferralFromUrl();
  }, [location.search]);
  return null;
};

const ToolRouteWithCreditGate = ({ children }: { children: ReactNode }) => (
  <>
    <CreditStatusBanner />
    {children}
  </>
);

function App() {
  const { hasUpdate, refreshApp } = useVersionCheck();

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserProvider>
            <ProgressProvider>
              <TooltipProvider>
                {hasUpdate && <VersionUpdateBanner onRefresh={refreshApp} />}
                <MobileOptimization />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1a1a2e' }} />}>
                    <ScrollToTop />
                    <InteractionTelemetryBridge />
                    <ReferralCaptureBridge />
                    <UpgradePromptProvider>
                      <CreditGateProvider>
                        <ProUpgradeBanner />
                        <Suspense fallback={null}>
                          <PulseWidgetWrapper />
                        </Suspense>
                        <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/build" element={<BuildPage />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/faq" element={<FAQPage />} />
                        <Route path="/resources" element={<Resources />} />
                        <Route path="/answers" element={<FounderAnswerLibrary />} />
                        <Route path="/answers/:slug" element={<FounderAnswerPage />} />
                        <Route path="/startup-guide" element={<StartupGuide />} />
                        <Route path="/services" element={<Services />} />
                        <Route path="/software" element={<Software />} />
                        <Route path="/mentorship" element={<CommunityPage />} />
                        <Route path="/mentorship/progress" element={<ProgressCommunityPage />} />
                        <Route path="/mentorship/mentors/:id" element={<MentorProfilePage />} />
                        <Route path="/mentorship/book/:id" element={<MentorBookingPage />} />
                        <Route path="/co-founder" element={<FindCoFounder />} />
                        <Route path="/co-founder/create" element={<CreateCoFounderPost />} />
                        <Route path="/co-founder/edit/:postId" element={<EditCoFounderPost />} />
                        <Route path="/investors" element={<FindYourAngel />} />
                        <Route path="/investors/admin/new" element={<AdminRoute><AdminAngelEditor /></AdminRoute>} />
                        <Route path="/investors/admin/edit/:id" element={<AdminRoute><AdminAngelEditor /></AdminRoute>} />
                        <Route path="/mentorship/my-bookings" element={<MyBookings />} />
                        <Route path="/mentorship/admin/new" element={<AdminRoute><AdminMentorEditor /></AdminRoute>} />
                        <Route path="/mentorship/admin/edit/:id" element={<AdminRoute><AdminMentorEditor /></AdminRoute>} />
                        <Route path="/mentorship/:slug" element={<MentorProfilePage />} />
                        <Route path="/community" element={<LegacyCommunityRedirect />} />
                        <Route path="/community/*" element={<LegacyCommunityRedirect />} />
                        <Route path="/newspaper" element={<Stories />} />
                        <Route path="/newspaper/rss.xml" element={<StoriesRSS />} />
                        <Route path="/newspaper/tags/:tagSlug" element={<StoryTagPage />} />
                        <Route path="/newspaper/admin/new" element={<AdminRoute><AdminStoryEditor /></AdminRoute>} />
                        <Route path="/newspaper/admin/edit/:id" element={<AdminRoute><AdminStoryEditor /></AdminRoute>} />
                        <Route path="/newspaper/:slug" element={<StoryArticle />} />
                        <Route path="/stories" element={<Navigate to="/newspaper" replace />} />
                        <Route path="/stories/rss.xml" element={<Navigate to="/newspaper/rss.xml" replace />} />
                        <Route path="/stories/tags/:tagSlug" element={<StoryTagPage />} />
                        <Route path="/stories/admin/new" element={<Navigate to="/newspaper/admin/new" replace />} />
                        <Route path="/stories/admin/edit/:id" element={<AdminRoute><AdminStoryEditor /></AdminRoute>} />
                        <Route path="/stories/:slug" element={<StoryArticle />} />
                        <Route path="/admin/hero-images" element={<AdminRoute><AdminHeroImages /></AdminRoute>} />
                        <Route path="/admin/vc-management" element={<AdminRoute><AdminVCManagement /></AdminRoute>} />
                        <Route path="/admin/accelerator-management" element={<AdminRoute><AdminAcceleratorManagement /></AdminRoute>} />
                        <Route path="/careers" element={<Careers />} />
                        <Route path="/prompt-library" element={<PromptLibrary />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/data-privacy" element={<DataPrivacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/ip-policy" element={<IPPolicy />} />
                        <Route path="/unsubscribe" element={<Unsubscribe />} />
                        <Route path="/bizmap-ai" element={<BizMapJourneyHubPage />} />
                        <Route path="/bizmap-ai/chat" element={<RouteErrorBoundary routeName="BizMap AI"><ToolRouteWithCreditGate><Dream2Plan /></ToolRouteWithCreditGate></RouteErrorBoundary>} />
                        <Route path="/pmf-lab" element={<RouteErrorBoundary routeName="PMF Lab"><PMFLabPage /></RouteErrorBoundary>} />
                        <Route path="/bizmap-ai/pmf-lab" element={<Navigate to="/pmf-lab" replace />} />
                        <Route path="/tech-stack" element={<TechStackPage />} />
                        <Route path="/bizmap-ai/tech-stack" element={<Navigate to="/tech-stack" replace />} />
                        <Route path="/icp-builder" element={<RouteErrorBoundary routeName="ICP Builder"><ToolRouteWithCreditGate><ICPBuilderPage /></ToolRouteWithCreditGate></RouteErrorBoundary>} />
                        <Route path="/icp/draft/:draftId" element={<IcpDraftPage />} />
                        <Route path="/icp/:draftId/public" element={<IcpPublicDraftPage />} />
                        <Route path="/bizmap-ai/icp-builder" element={<Navigate to="/icp-builder" replace />} />
                        <Route path="/decision-sprint" element={<ToolRouteWithCreditGate><ValidateJourneyPage /></ToolRouteWithCreditGate>} />
                        <Route path="/validate" element={<ToolRouteWithCreditGate><ValidateJourney /></ToolRouteWithCreditGate>} />
                        {/* Demo Studio = the new interactive demo builder (front door) */}
                        <Route path="/demo-studio" element={<RouteErrorBoundary routeName="Demo Studio"><DemoStudioProjectsPage /></RouteErrorBoundary>} />
                        <Route path="/demo-studio/projects" element={<RouteErrorBoundary routeName="Demo Studio"><DemoStudioProjectsPage /></RouteErrorBoundary>} />
                        {/* Legacy waitlist builder, preserved until the Launch Page replaces it */}
                        <Route path="/demo-studio/classic" element={<ToolRouteWithCreditGate><WaitlistMakerPage /></ToolRouteWithCreditGate>} />
                        <Route path="/demo-studio/classic/templates" element={<WaitlistTemplatesPage />} />
                        <Route path="/demo-studio/templates" element={<Navigate to="/demo-studio/classic/templates" replace />} />
                        <Route path="/demo-studio/projects/:id" element={<RouteErrorBoundary routeName="Demo Studio Project"><DemoStudioProjectOverviewPage /></RouteErrorBoundary>} />
                        <Route path="/demo-studio/projects/:projectId/demos/:demoId/edit" element={<RouteErrorBoundary routeName="Demo Editor"><DemoStudioEditorPage /></RouteErrorBoundary>} />
                        <Route path="/demo-studio/projects/:id/vsl" element={<RouteErrorBoundary routeName="VSL Studio"><DemoStudioVslStudioPage /></RouteErrorBoundary>} />
                        <Route path="/demo-studio/projects/:id/launch" element={<RouteErrorBoundary routeName="Launch Composer"><DemoStudioLaunchComposerPage /></RouteErrorBoundary>} />
                        <Route path="/p/:slug" element={<PublicLaunchPage />} />
                        <Route path="/demo/:publicId" element={<PublicDemoPage />} />
                        <Route path="/embed/demo/:publicId" element={<EmbedDemoPage />} />
                        <Route path="/waitlist" element={<Navigate to="/demo-studio/classic" replace />} />
                        <Route path="/waitlist/templates" element={<Navigate to="/demo-studio/classic/templates" replace />} />
                        <Route path="/waitlist-maker" element={<Navigate to="/demo-studio/classic" replace />} />
                        <Route path="/w/:slug" element={<WaitlistPublicPage />} />
                        <Route path="/directories" element={<DirectoriesPage />} />
                        <Route path="/mvp-builder" element={<ToolRouteWithCreditGate><AppBuilderPage /></ToolRouteWithCreditGate>} />
                        <Route path="/mvp-scope" element={<MVPBuilderBetaPage />} />
                        <Route path="/go-to-market" element={<RouteErrorBoundary routeName="GTM Strategist"><ToolRouteWithCreditGate><GTMStrategistPage /></ToolRouteWithCreditGate></RouteErrorBoundary>} />
                        <Route path="/client-acquisition" element={<Navigate to="/go-to-market" replace />} />

                        <Route path="/auth" element={<Auth />} />
                        <Route path="/login" element={<Login />} />
                <Route path="/sign-up" element={<Signup />} />
                <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route
                          path="/dashboard"
                          element={
                            <RouteErrorBoundary routeName="Dashboard">
                              <DashboardShell />
                            </RouteErrorBoundary>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="files" element={<FilesPage />} />
                          <Route path="tasks" element={<TasksPage />} />
                          <Route path="routine" element={<YourRoutinePage />} />
                          <Route path="weekly-mission" element={<Navigate to="/dashboard/routine" replace />} />
                          <Route path="referral" element={<ReferralDashboardPage />} />
                          <Route path="focus-funnel" element={<FocusFunnel />} />
                        </Route>
                        <Route path="/projects-dashboard" element={<ProjectsDashboard />} />
                        <Route path="/referral-program" element={<ReferralProgram />} />
                        <Route path="/accountability" element={<Accountability />} />
                        <Route path="/saved-mentors" element={<SavedMentorsPage />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/setup-quiz" element={<SetupQuiz />} />
                        <Route path="/files" element={<Navigate to="/dashboard/files" replace />} />
                        <Route path="/focus-funnel" element={<Navigate to="/dashboard/focus-funnel" replace />} />
                        <Route path="/ai-goals" element={<AiGoalsPage />} />
                        <Route path="/core-metrics" element={<CoreMetricsPage />} />
                        <Route path="/routine" element={<Navigate to="/dashboard/routine" replace />} />
                        <Route path="/weekly-mission" element={<Navigate to="/dashboard/routine" replace />} />
                        <Route path="/tasks" element={<Navigate to="/dashboard/tasks" replace />} />
                        <Route path="/insighta" element={<Blog />} />
                        <Route path="/vc-search" element={<VCSearchPage />} />
                        <Route path="/email-templates" element={<EmailTemplatesPage />} />
                        <Route path="/accelerator-hunt" element={<AcceleratorHuntPage />} />
                        <Route path="/insighta/vc-search" element={<Navigate to="/vc-search" replace />} />
                        <Route path="/insighta/email-templates" element={<Navigate to="/email-templates" replace />} />
                        <Route path="/insighta/accelerator-hunt" element={<Navigate to="/accelerator-hunt" replace />} />
                        <Route
                          path="/traction-engine"
                          element={
                            <RouteErrorBoundary routeName="TractionEngine">
                              <TractionEnginePage />
                            </RouteErrorBoundary>
                          }
                        />
                        <Route path="/insighta/traction-engine" element={<Navigate to="/traction-engine" replace />} />
                        <Route path="/pitch-deck-analyzer" element={<PitchDeckAnalyzerPage />} />
                        <Route path="/insighta-test" element={<ToolRouteWithCreditGate><InsightaTestPage /></ToolRouteWithCreditGate>} />
                        <Route path="/insighta/pitch-deck-analyzer" element={<Navigate to="/pitch-deck-analyzer" replace />} />
                        <Route path="/insighta/test" element={<Navigate to="/insighta-test" replace />} />
                        <Route path="/insighta/vc/:slug" element={<VCProfilePage />} />
                        <Route path="/insighta/accelerator/:slug" element={<AcceleratorProfilePage />} />
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/demo-calls" element={<DemoCalls />} />
                        <Route path="/messages/:username" element={<Messages />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/profile/:username" element={<Profile />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/creatives-takeover" element={<AdminRoute><CreativesTakeover /></AdminRoute>} />
                        <Route path="/rag-test" element={<AdminRoute><RAGTest /></AdminRoute>} />
                        <Route path="/test-phase1" element={<AdminRoute><TestPhase1 /></AdminRoute>} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                        </Routes>
                        <Suspense fallback={null}>
                          <MobileBottomNav />
                        </Suspense>
                      </CreditGateProvider>
                    </UpgradePromptProvider>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </ProgressProvider>
          </UserProvider>
        </AuthProvider>
        </QueryClientProvider>
      </MotionConfig>
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </ErrorBoundary>
  );
};

const SignUpAlias = () => {
  const location = useLocation();
  return <Navigate replace to={`/signup${location.search}`} />;
};

export default App;
