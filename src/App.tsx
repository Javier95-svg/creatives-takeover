import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { ProgressProvider } from "@/contexts/ProgressContext";
import MobileOptimization from "@/components/MobileOptimization";
import VersionUpdateBanner from "@/components/VersionUpdateBanner";
import FloatingFeedbackWidget from "@/components/FloatingFeedbackWidget";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import { Analytics } from '@vercel/analytics/react';

// Lazy load all routes for code splitting
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
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Login = lazy(() => import("./pages/Login"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Blog = lazy(() => import("./pages/Blog"));
const Stories = lazy(() => import("./pages/Stories"));
const StoryArticle = lazy(() => import("./pages/StoryArticle"));
const StoryTagPage = lazy(() => import("./pages/StoryTagPage"));
const AdminStoryEditor = lazy(() => import("./pages/AdminStoryEditor"));
const AdminHeroImages = lazy(() => import("./pages/AdminHeroImages"));
const StoriesRSS = lazy(() => import("./pages/StoriesRSS"));
const Demo = lazy(() => import("./pages/Demo"));
const Profile = lazy(() => import("./pages/Profile"));
const Account = lazy(() => import("./pages/Account"));
const Messages = lazy(() => import("./pages/Messages"));
const CreativesTakeover = lazy(() => import("./pages/CreativesTakeover"));
const RAGTest = lazy(() => import("./pages/RAGTest"));
const MentorMarketplaceHub = lazy(() => import("./pages/community/MentorMarketplaceHub"));
const MentorProfilePage = lazy(() => import("./pages/community/MentorProfilePage"));
const MentorBookingPage = lazy(() => import("./pages/community/MentorBookingPage"));
const MyBookings = lazy(() => import("./pages/community/MyBookings"));
const AdminMentorEditor = lazy(() => import("./pages/community/AdminMentorEditor"));

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

const FeedbackWidgetWrapper = () => {
  const location = useLocation();
  
  // Show feedback widget on public pages
  const publicPages = ['/', '/about', '/pricing', '/community', '/careers', '/insighta', '/demo'];
  const showWidget = publicPages.includes(location.pathname) || location.pathname.startsWith('/insighta/');
  
  return showWidget ? <FloatingFeedbackWidget /> : null;
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
                <ScrollToTop />
                <FeedbackWidgetWrapper />
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/community/mentors/:id" element={<MentorProfilePage />} />
                    <Route path="/community/book/:id" element={<MentorBookingPage />} />
                    <Route path="/community/my-bookings" element={<MyBookings />} />
                    <Route path="/community/admin/new" element={<AdminMentorEditor />} />
                    <Route path="/community/admin/edit/:id" element={<AdminMentorEditor />} />
                    <Route path="/stories" element={<Stories />} />
                    <Route path="/stories/rss.xml" element={<StoriesRSS />} />
                    <Route path="/stories/tags/:tagSlug" element={<StoryTagPage />} />
                    <Route path="/stories/:slug" element={<StoryArticle />} />
                    <Route path="/stories/admin/new" element={<AdminStoryEditor />} />
                    <Route path="/stories/admin/edit/:id" element={<AdminStoryEditor />} />
                    <Route path="/admin/hero-images" element={<AdminHeroImages />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/prompt-library" element={<PromptLibrary />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/bizmap-ai" element={<Dream2Plan />} />
                    
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/insighta" element={<Blog />} />
                    <Route path="/demo" element={<Demo />} />
                    <Route path="/messages/:username" element={<Messages />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/profile/:username" element={<Profile />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/creatives-takeover" element={<CreativesTakeover />} />
                    <Route path="/rag-test" element={<RAGTest />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <MobileBottomNav />
              </BrowserRouter>
            </TooltipProvider>
          </ProgressProvider>
        </UserProvider>
      </AuthProvider>
      </QueryClientProvider>
      <Analytics />
    </ErrorBoundary>
  );
};

export default App;