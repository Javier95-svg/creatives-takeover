import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Services from "./pages/Services";
import PricingPage from "./pages/PricingPage";
import CommunityPage from "./pages/CommunityPage";
import Resources from "./pages/Resources";
import FAQPage from "./pages/FAQPage";
import NotFound from "./pages/NotFound";
import Software from "./pages/Software";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import IPPolicy from "./pages/IPPolicy";
import Laboratory from "./pages/Laboratory";
import Signup from "./pages/Signup";
import BizMapAI from "./pages/Dream2Plan";
import Login from "./pages/Login";
import PromptLibrary from "./pages/PromptLibrary";
import AuthCallback from "./pages/AuthCallback";
import Account from "./pages/Account";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/account" element={<Account />} />
            <Route path="/news" element={<Blog />} />
            <Route path="/news/:slug" element={<BlogPost />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;