import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ArticleRefreshTrigger } from "@/components/admin/ArticleRefreshTrigger";
import ScrollToTop from "@/components/ScrollToTop";

const AdminTools = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <Navigation />
      <ScrollToTop />
      
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              Admin Tools
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Manage and maintain the Insighta article catalogue
            </p>
          </div>

          <ArticleRefreshTrigger />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminTools;
