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
import { useVersionCheck } from "@/hooks/useVersionCheck";
import Index from "./pages/Index";
import About from "./pages/About";
import PricingPage from "./pages/PricingPage";
import CommunityPage from "./pages/CommunityPage";
import NotFound from "./pages/NotFound";
import Careers from "./pages/Careers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Signup from "./pages/Signup";
import BizMapAI from "./pages/Dream2Plan";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import PromptLibrary from "./pages/PromptLibrary";
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import ScrollToTop from "./components/ScrollToTop";
import Demo from "./pages/Demo";
import Profile from "./pages/Profile";
import Account from "./pages/Account";
import Messages from "./pages/Messages";
import CreativesTakeover from "./pages/CreativesTakeover";

const queryClient = new QueryClient();

const FeedbackWidgetWrapper = () => {
  const location = useLocation();
  
  // Show feedback widget on public pages
  const publicPages = ['/', '/about', '/pricing', '/community', '/careers', '/insighta', '/demo'];
  const showWidget = publicPages.includes(location.pathname) || location.pathname.startsWith('/insighta/');
  
  return showWidget ? <FloatingFeedbackWidget /> : null;
};

const App = () => {
  const { hasUpdate, refreshApp } = useVersionCheck();

  return (
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
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/prompt-library" element={<PromptLibrary />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/bizmap-ai" element={<BizMapAI />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/insighta" element={<Blog />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/profile/:username" element={<Profile />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/creatives-takeover" element={<CreativesTakeover />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ProgressProvider>
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;