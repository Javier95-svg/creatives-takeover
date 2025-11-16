import { Suspense } from "react";
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
import React from "react";

const Index = React.lazy(() => import("./pages/Index"));
const About = React.lazy(() => import("./pages/About"));
const PricingPage = React.lazy(() => import("./pages/PricingPage"));
const CommunityPage = React.lazy(() => import("./pages/CommunityPage"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Careers = React.lazy(() => import("./pages/Careers"));
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Signup = React.lazy(() => import("./pages/Signup"));
const Dream2Plan = React.lazy(() => import("./pages/Dream2Plan"));

const Login = React.lazy(() => import("./pages/Login"));
const Auth = React.lazy(() => import("./pages/Auth"));
const AuthCallback = React.lazy(() => import("./pages/AuthCallback"));
const PromptLibrary = React.lazy(() => import("./pages/PromptLibrary"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Blog = React.lazy(() => import("./pages/Blog"));
import ScrollToTop from "./components/ScrollToTop";
const Demo = React.lazy(() => import("./pages/Demo"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Account = React.lazy(() => import("./pages/Account"));
const Messages = React.lazy(() => import("./pages/Messages"));
const CreativesTakeover = React.lazy(() => import("./pages/CreativesTakeover"));
const RAGTest = React.lazy(() => import("./pages/RAGTest"));
import { Analytics } from '@vercel/analytics/react';

const queryClient = new QueryClient();

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
    <>
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
                <Suspense fallback={<div className="min-h-screen bg-background" />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/prompt-library" element={<PromptLibrary />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/bizmap-ai" element={<Dream2Plan />} />
                    
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
                    <Route path="/rag-test" element={<RAGTest />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </ProgressProvider>
        </UserProvider>
      </AuthProvider>
      </QueryClientProvider>
      <Analytics />
    </>
  );
};

export default App;