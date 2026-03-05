import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import { UpgradePromptProvider } from "@/contexts/UpgradePromptContext";
import MobileOptimization from "@/components/MobileOptimization";
import VersionUpdateBanner from "@/components/VersionUpdateBanner";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import ProUpgradeBanner from "@/components/ProUpgradeBanner";

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
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Careers = lazy(() => import("./pages/Careers"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Signup = lazy(() => import("./pages/Signup"));
const Dream2Plan = lazy(() => import("./pages/Dream2Plan"));
const BizMapJourneyHubPage = lazy(() => import("./pages/BizMapJourneyHubPage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

const Login = lazy(() => import("./pages/Login"));
const AuthEntryRedirect = lazy(() => import("./pages/AuthEntryRedirect"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const MentorMarketplaceHub = lazy(() => import("./pages/community/MentorMarketplaceHub"));
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
const WaitlistMakerPage = lazy(() => import("./pages/WaitlistMakerPage"));
const ValidateJourneyPage = lazy(() => import("./pages/ValidateJourneyPage"));
const TechStackPage = lazy(() => import("./pages/TechStackPage"));
const MVPBuilderBetaPage = lazy(() => import("./pages/MVPBuilderBetaPage"));
const GTMStrategistPage = lazy(() => import("./pages/GTMStrategistPage"));
const DirectoriesPage = lazy(() => import("./pages/DirectoriesPage"));
const StageRouteGuard = lazy(() => import("./components/bizmap/StageRouteGuard"));
const FocusFunnel = lazy(() => import("./pages/FocusFunnel"));
const CoreMetricsPage = lazy(() => import("./pages/CoreMetricsPage"));
const WeeklyMissionPage = lazy(() => import("./pages/WeeklyMissionPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const ValidateJourney = lazy(() => import("./pages/journeys/ValidateJourney"));
const MvpJourney = lazy(() => import("./pages/journeys/MvpJourney"));
const FirstCustomersJourney = lazy(() => import("./pages/journeys/FirstCustomersJourney"));
const FindYourAngel = lazy(() => import("./pages/community/FindYourAngel"));
const AdminAngelEditor = lazy(() => import("./pages/community/AdminAngelEditor"));
const WaitlistPublicPage = lazy(() => import("./pages/WaitlistPublicPage"));
const AppBuilderPage = lazy(() => import("./pages/AppBuilderPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const PulseWidgetWrapper = () => {
  const location = useLocation();

  // Show Pulse on all pages except auth flows, admin, and full-screen builders
  const excludedPaths = ['/onboarding', '/auth', '/login', '/signup', '/forgot-password', '/reset-password', '/mvp-builder'];
  const isExcluded = excludedPaths.some(p => location.pathname.startsWith(p));

  if (isExcluded) return null;
  return <PulseWidget />;
};

function App() {
  const { hasUpdate, refreshApp } = useVersionCheck();

  return (
    <ErrorBoundary>
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
                  <Suspense fallback={null}>
                    <ScrollToTop />
                    <UpgradePromptProvider>
                      <ProUpgradeBanner />
                      <PulseWidgetWrapper />
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/pricing" element={<PricingPage />} />
                        <Route path="/community" element={<CommunityPage />} />
                        <Route path="/community/mentors/:id" element={<MentorProfilePage />} />
                        <Route path="/community/book/:id" element={<MentorBookingPage />} />
                        <Route path="/community/co-founders" element={<FindCoFounder />} />
                        <Route path="/community/co-founders/create" element={<CreateCoFounderPost />} />
                        <Route path="/community/co-founders/edit/:postId" element={<EditCoFounderPost />} />
                        <Route path="/community/angels" element={<FindYourAngel />} />
                        <Route path="/community/angels/admin/new" element={<AdminAngelEditor />} />
                        <Route path="/community/angels/admin/edit/:id" element={<AdminAngelEditor />} />
                        <Route path="/community/my-bookings" element={<MyBookings />} />
                        <Route path="/community/admin/new" element={<AdminMentorEditor />} />
                        <Route path="/community/admin/edit/:id" element={<AdminMentorEditor />} />
                        <Route path="/community/:slug" element={<MentorProfilePage />} />
                        <Route path="/newspaper" element={<Stories />} />
                        <Route path="/newspaper/rss.xml" element={<StoriesRSS />} />
                        <Route path="/newspaper/tags/:tagSlug" element={<StoryTagPage />} />
                        <Route path="/newspaper/:slug" element={<StoryArticle />} />
                        <Route path="/newspaper/admin/new" element={<AdminStoryEditor />} />
                        <Route path="/newspaper/admin/edit/:id" element={<AdminStoryEditor />} />
                        <Route path="/stories" element={<Navigate to="/newspaper" replace />} />
                        <Route path="/stories/rss.xml" element={<Navigate to="/newspaper/rss.xml" replace />} />
                        <Route path="/stories/tags/:tagSlug" element={<StoryTagPage />} />
                        <Route path="/stories/:slug" element={<StoryArticle />} />
                        <Route path="/stories/admin/new" element={<AdminStoryEditor />} />
                        <Route path="/stories/admin/edit/:id" element={<AdminStoryEditor />} />
                        <Route path="/admin/hero-images" element={<AdminHeroImages />} />
                        <Route path="/admin/vc-management" element={<AdminVCManagement />} />
                        <Route path="/admin/accelerator-management" element={<AdminAcceleratorManagement />} />
                        <Route path="/careers" element={<Careers />} />
                        <Route path="/prompt-library" element={<PromptLibrary />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/bizmap-ai" element={<BizMapJourneyHubPage />} />
                        <Route path="/bizmap-ai/chat" element={<Dream2Plan />} />
                        <Route path="/pmf-lab" element={<StageRouteGuard route="/pmf-lab"><PMFLabPage /></StageRouteGuard>} />
                        <Route path="/bizmap-ai/pmf-lab" element={<Navigate to="/pmf-lab" replace />} />
                        <Route path="/tech-stack" element={<StageRouteGuard route="/tech-stack"><TechStackPage /></StageRouteGuard>} />
                        <Route path="/bizmap-ai/tech-stack" element={<Navigate to="/tech-stack" replace />} />
                        <Route path="/icp-builder" element={<StageRouteGuard route="/icp-builder"><ICPBuilderPage /></StageRouteGuard>} />
                        <Route path="/bizmap-ai/icp-builder" element={<Navigate to="/icp-builder" replace />} />
                        <Route path="/waitlist" element={<StageRouteGuard route="/waitlist"><WaitlistMakerPage /></StageRouteGuard>} />
                        <Route path="/waitlist-builder" element={<Navigate to="/waitlist" replace />} />
                        <Route path="/decision-sprint" element={<ValidateJourneyPage />} />
                        <Route path="/validate" element={<ValidateJourney />} />
                        <Route path="/mvp-builder" element={<AppBuilderPage />} />
                        <Route path="/mvp-scope" element={<StageRouteGuard route="/mvp-scope"><MVPBuilderBetaPage /></StageRouteGuard>} />
                        <Route path="/go-to-market" element={<StageRouteGuard route="/go-to-market"><GTMStrategistPage /></StageRouteGuard>} />
                        <Route path="/directories" element={<StageRouteGuard route="/go-to-market"><DirectoriesPage /></StageRouteGuard>} />
                        <Route path="/client-acquisition" element={<Navigate to="/go-to-market" replace />} />

                        <Route path="/auth" element={<AuthEntryRedirect />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/setup-quiz" element={<SetupQuiz />} />
                        <Route path="/focus-funnel" element={<FocusFunnel />} />
                        <Route path="/core-metrics" element={<CoreMetricsPage />} />
                        <Route path="/weekly-mission" element={<WeeklyMissionPage />} />
                        <Route path="/tasks" element={<TasksPage />} />
                        <Route path="/insighta" element={<Blog />} />
                        <Route path="/insighta/vc-search" element={<VCSearchPage />} />
                        <Route path="/insighta/email-templates" element={<EmailTemplatesPage />} />
                        <Route path="/insighta/accelerator-hunt" element={<AcceleratorHuntPage />} />
                        <Route path="/insighta/pitch-deck-analyzer" element={<PitchDeckAnalyzerPage />} />
                        <Route path="/insighta/test" element={<InsightaTestPage />} />
                        <Route path="/insighta/vc/:slug" element={<VCProfilePage />} />
                        <Route path="/insighta/accelerator/:slug" element={<AcceleratorProfilePage />} />
                        <Route path="/demo" element={<Demo />} />
                        <Route path="/messages/:username" element={<Messages />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/profile/:username" element={<Profile />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/creatives-takeover" element={<CreativesTakeover />} />
                        <Route path="/rag-test" element={<RAGTest />} />
                        <Route path="/test-phase1" element={<TestPhase1 />} />
                        <Route path="/w/:slug" element={<WaitlistPublicPage />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <MobileBottomNav />
                    </UpgradePromptProvider>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </ProgressProvider>
          </UserProvider>
        </AuthProvider>
      </QueryClientProvider>
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
