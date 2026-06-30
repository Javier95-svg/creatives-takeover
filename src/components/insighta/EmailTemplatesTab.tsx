import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { EmailCategory, EmailTemplate } from "@/types/insighta";
import EmailTemplateCard from "@/components/templates/EmailTemplateCard";
import EmailTemplateModal from "@/components/templates/EmailTemplateModal";
import { useAuth } from "@/contexts/AuthContext";

const EmailTemplatesTab = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { templates, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useEmailTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!isAuthenticated || !templateId) return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setSelectedTemplate(template);
    setIsModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("template");
    setSearchParams(next, { replace: true });
  }, [isAuthenticated, searchParams, setSearchParams, templates]);

  const categories: Array<{ id: EmailCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Templates' },
    { id: 'cold-outreach', label: 'Cold Outreach' },
    { id: 'warm-introduction', label: 'Warm Intros' },
    { id: 'follow-up', label: 'Follow-ups' },
    { id: 'thank-you', label: 'Thank You' },
    { id: 'update', label: 'Updates' },
  ];

  const handleViewTemplate = (template: EmailTemplate) => {
    if (!isAuthenticated) {
      const returnPath = `/email-templates?template=${encodeURIComponent(template.id)}`;
      navigate(`/signup?from=email-template&source=email-template&return=${encodeURIComponent(returnPath)}`);
      return;
    }
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="capitalize"
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-center text-sm text-muted-foreground">
        {templates.length} {templates.length === 1 ? 'template' : 'templates'} found
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {templates.map((template) => (
          <EmailTemplateCard
            key={template.id}
            template={template}
            onViewTemplate={handleViewTemplate}
          />
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg mb-2">No templates found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or browse all categories
          </p>
        </div>
      )}

      {/* Template Modal */}
      <EmailTemplateModal
        template={selectedTemplate}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default EmailTemplatesTab;
