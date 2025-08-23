import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogGrid from "@/components/blog/BlogGrid";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>News - Creatives Takeover | Business Tips & AI Insights</title>
        <meta name="description" content="Discover expert insights on business planning, AI tools, entrepreneurship, and creative strategies. Stay updated with the latest trends in business innovation." />
        <meta name="keywords" content="business news, entrepreneurship tips, AI business tools, startup advice, creative business strategies" />
      </Helmet>
      <Navigation />
      <main>
        <BlogHero />
        <BlogGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Blog;