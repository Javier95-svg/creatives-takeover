import { blogPosts } from "@/data/blogPosts";
import BlogCard from "./BlogCard";
import { useArticles } from "@/hooks/useArticles";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import ArticleEditor from "./ArticleEditor";
import { MigrationButton } from "./MigrationButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BlogGrid = () => {
  const { articles, loading, refetch, deleteArticle } = useArticles();
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // Combine database articles with static blog posts for now
  const allPosts = [
    ...articles.filter(article => user || article.is_published).map(article => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      image: article.image,
      date: new Date(article.date).toLocaleDateString(),
      readTime: article.read_time,
      tags: article.tags,
      author: {
        name: article.author_name || 'Admin',
        avatar: article.author_avatar,
      },
      externalUrl: article.external_url,
    })),
    ...blogPosts,
  ];

  // Sort posts by date (most recent first)
  const sortedPosts = allPosts.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleCreateNew = () => {
    setEditingArticle(null);
    setShowEditor(true);
  };

  const handleEditArticle = (article: any) => {
    const dbArticle = articles.find(a => a.id === article.id);
    if (dbArticle) {
      setEditingArticle(dbArticle);
      setShowEditor(true);
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
  };

  const handleSaveEditor = () => {
    // Refresh will happen automatically through the hook
  };

  const handleDeleteClick = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingArticleId(articleId);
  };

  const handleDeleteConfirm = async () => {
    if (deletingArticleId) {
      await deleteArticle(deletingArticleId);
      setDeletingArticleId(null);
      refetch();
    }
  };

  const handleDeleteCancel = () => {
    setDeletingArticleId(null);
  };

  if (loading) {
    return (
      <section className="pt-0 pb-16">
        <div className="container mx-auto px-6">
          <div className="text-center py-16">
            <p className="text-muted-foreground">Loading articles...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-0 pb-16">
      <div className="container mx-auto px-6">
        {user && (
          <div className="flex flex-col items-center gap-4 mb-8">
            <MigrationButton onMigrationComplete={() => refetch()} />
            <Button onClick={handleCreateNew} className="glass">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {sortedPosts.map((post, index) => (
            <div key={post.slug} className="relative group">
              <BlogCard 
                post={post}
                className={`animate-fade-in-up [animation-delay:${index * 0.1}s]`}
              />
              {user && articles.find(a => a.id === post.id) && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditArticle(post)}
                    className="glass"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteClick(post.id, e)}
                    className="glass hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
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

      {showEditor && (
        <ArticleEditor
          article={editingArticle}
          onClose={handleCloseEditor}
          onSave={handleSaveEditor}
        />
      )}

      <AlertDialog open={!!deletingArticleId} onOpenChange={() => setDeletingArticleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default BlogGrid;