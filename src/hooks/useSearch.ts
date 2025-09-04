import { useState, useMemo } from 'react';
import { Trend } from '@/hooks/useTrends';

export interface SearchFilters {
  category: string;
  difficulty: string;
  marketSize: string;
  sentiment: string;
  sortBy: string;
}

export const useSearch = (trends: Trend[]) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    category: "all",
    difficulty: "all", 
    marketSize: "all",
    sentiment: "all",
    sortBy: "opportunity_score"
  });

  const filteredTrends = useMemo(() => {
    let filtered = trends;

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(trend => 
        trend.title.toLowerCase().includes(term) ||
        trend.description.toLowerCase().includes(term) ||
        trend.keywords.some(keyword => keyword.toLowerCase().includes(term)) ||
        trend.business_opportunity?.market_gap.toLowerCase().includes(term) ||
        trend.business_opportunity?.target_audience.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (filters.category !== "all") {
      filtered = filtered.filter(trend => trend.category === filters.category);
    }

    // Difficulty filter  
    if (filters.difficulty !== "all") {
      const difficultyMap = {
        "easy": [1, 2, 3],
        "medium": [4, 5, 6], 
        "hard": [7, 8, 9, 10]
      };
      const allowedDifficulties = difficultyMap[filters.difficulty as keyof typeof difficultyMap];
      filtered = filtered.filter(trend => 
        trend.entry_difficulty && allowedDifficulties.includes(trend.entry_difficulty)
      );
    }

    // Market size filter
    if (filters.marketSize !== "all") {
      filtered = filtered.filter(trend => 
        trend.market_size_estimate === filters.marketSize ||
        trend.market_size_indicator === filters.marketSize
      );
    }

    // Sentiment filter
    if (filters.sentiment !== "all") {
      filtered = filtered.filter(trend => trend.sentiment === filters.sentiment);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "opportunity_score":
          return (b.opportunity_score || 0) - (a.opportunity_score || 0);
        case "trend_score":
          return (b.trend_score || 0) - (a.trend_score || 0);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "difficulty":
          return (a.entry_difficulty || 5) - (b.entry_difficulty || 5);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [trends, searchTerm, filters]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({
      category: "all",
      difficulty: "all",
      marketSize: "all", 
      sentiment: "all",
      sortBy: "opportunity_score"
    });
  };

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    updateFilter,
    filteredTrends,
    clearFilters,
    hasActiveFilters: searchTerm.trim() !== "" || Object.values(filters).some(v => v !== "all" && v !== "opportunity_score")
  };
};