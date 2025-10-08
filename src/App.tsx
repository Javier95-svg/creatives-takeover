import Messages from "./pages/Messages";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import MobileOptimization from "@/components/MobileOptimization";
import Index from "./pages/Index";
import CreativesTakeover from "./pages/CreativesTakeover";
import About from "./pages/About";
import Services from "./pages/Services";
import PricingPage from "./pages/PricingPage";
import CommunityPage from "./pages/CommunityPage";
import Resources from "./pages/Resources";
import FAQPage from "./pages/FAQPage";
import NotFound from "./pages/NotFound";
import Software from "./pages/Software";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
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
import Dashboard from "./pages/Dashboard";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Auth from "./pages/Auth";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import CollaborationDemo from "./pages/CollaborationDemo";
// import InteractiveCollaborationDemo from "./pages/InteractiveCollaborationDemo";
import Phase4CollaborationDemo from "./pages/Phase4CollaborationDemo";
import AdminJobApplications from "./pages/AdminJobApplications";
import AdminTools from "./pages/AdminTools";
import ScrollToTop from "./components/ScrollToTop";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <MobileOptimization />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/creatives-takeover" element={<CreativesTakeover />} />
            <Route path="/software" element={<Software />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/messages" element={<Messages />} />
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
            <Route path="/news" element={<Blog />} />
            <Route path="/news/:slug" element={<BlogPost />} />
            <Route path="/collaboration-demo" element={<CollaborationDemo />} />
            {/* <Route path="/interactive-collaboration" element={<InteractiveCollaborationDemo />} /> */}
            <Route path="/phase4-collaboration" element={<Phase4CollaborationDemo />} />
            <Route path="/admin/job-applications" element={<AdminJobApplications />} />
            <Route path="/admin/tools" element={<AdminTools />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/profile/:userId" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;