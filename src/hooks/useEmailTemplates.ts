import { useState, useMemo } from 'react';
import { EmailTemplate, EmailCategory } from '@/types/insighta';
import { emailTemplates, getTemplatesByCategory, searchTemplates } from '@/data/emailTemplates';
import { toast } from 'sonner';

export const useEmailTemplates = () => {
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    let results = emailTemplates;

    // Filter by category
    if (selectedCategory !== 'all') {
      results = getTemplatesByCategory(selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      results = searchTemplates(searchQuery);
    }

    // Sort by popularity
    return results.sort((a, b) => b.popularity - a.popularity);
  }, [selectedCategory, searchQuery]);

  const copyToClipboard = async (template: EmailTemplate, subjectOnly: boolean = false) => {
    try {
      const textToCopy = subjectOnly ? template.subject : `Subject: ${template.subject}\n\n${template.body}`;
      await navigator.clipboard.writeText(textToCopy);
      toast.success(subjectOnly ? 'Subject copied to clipboard!' : 'Template copied to clipboard!');
      return true;
    } catch (err) {
      toast.error('Failed to copy to clipboard');
      return false;
    }
  };

  return {
    templates: filteredTemplates,
    allTemplates: emailTemplates,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    copyToClipboard,
    filterByCategory: getTemplatesByCategory,
    searchTemplates
  };
};
