import { blogPosts } from "@/data/blogPosts";
import BlogCard from "./BlogCard";

const BlogGrid = () => {
  // Sort posts by date (most recent first)
  const sortedPosts = [...blogPosts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <section className="pt-0 pb-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedPosts.map((post, index) => (
            <BlogCard 
              key={post.slug} 
              post={post}
              className={`animate-fade-in-up [animation-delay:${index * 0.1}s]`}
            />
          ))}
        </div>

        {sortedPosts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-2xl font-bold mb-4">No Posts Yet</h3>
            <p className="text-muted-foreground">
              Check back soon for exciting content about business, AI, and entrepreneurship!
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogGrid;