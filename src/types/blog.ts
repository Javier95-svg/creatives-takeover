export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  date: string;
  readTime: number;
  tags?: string[];
  author?: {
    name: string;
    avatar?: string;
  };
  externalUrl?: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  description: string;
  slug: string;
}