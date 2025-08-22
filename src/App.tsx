import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import React, { Suspense, lazy } from "react";

// Lazy load all pages for better code splitting
const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const Resources = lazy(() => import("./pages/Resources"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Software = lazy(() => import("./pages/Software"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const IPPolicy = lazy(() => import("./pages/IPPolicy"));
const Laboratory = lazy(() => import("./pages/Laboratory"));
const Signup = lazy(() => import("./pages/Signup"));
const BizMapAI = lazy(() => import("./pages/Dream2Plan"));
const Login = lazy(() => import("./pages/Login"));
const PromptLibrary = lazy(() => import("./pages/PromptLibrary"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

// Loading component for better UX
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse-glow">
      <div className="w-8 h-8 bg-primary rounded-full animate-bounce-subtle"></div>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/software" element={<Software />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/prompt-library" element={<PromptLibrary />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/ip-policy" element={<IPPolicy />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/laboratory" element={<Laboratory />} />
              <Route path="/dream2plan" element={<BizMapAI />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;