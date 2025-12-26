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
import Index from "./pages/Index";
import About from "./pages/About";
import PricingPage from "./pages/PricingPage";
import CommunityPage from "./pages/CommunityPage";
import NotFound from "./pages/NotFound";
import Careers from "./pages/Careers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Signup from "./pages/Signup";
import Dream2Plan from "./pages/Dream2Plan";
import Onboarding from "./pages/Onboarding";

import Login from "./pages/Login";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PromptLibrary from "./pages/PromptLibrary";
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import Stories from "./pages/Stories";
import StoryArticle from "./pages/StoryArticle";
import StoryTagPage from "./pages/StoryTagPage";
import AdminStoryEditor from "./pages/AdminStoryEditor";
import AdminHeroImages from "./pages/AdminHeroImages";
import StoriesRSS from "./pages/StoriesRSS";
import ScrollToTop from "./components/ScrollToTop";
import Demo from "./pages/Demo";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Messages from "./pages/Messages";
import CreativesTakeover from "./pages/CreativesTakeover";
import RAGTest from "./pages/RAGTest";
import TestPhase1 from "./pages/TestPhase1";
import MentorMarketplaceHub from "./pages/community/MentorMarketplaceHub";
import MentorProfilePage from "./pages/community/MentorProfilePage";
import MentorBookingPage from "./pages/community/MentorBookingPage";
import MyBookings from "./pages/community/MyBookings";
import AdminMentorEditor from "./pages/community/AdminMentorEditor";
import { Analytics } from '@vercel/analytics/react';

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
                  <Route path="/test-phase1" element={<TestPhase1 />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
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