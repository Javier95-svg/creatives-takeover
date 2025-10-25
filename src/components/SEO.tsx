import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  canonical?: string;
  noindex?: boolean;
  structuredData?: object | object[];
}

/**
 * Reusable SEO component for consistent meta tags across all pages
 * Automatically generates: meta tags, Open Graph, Twitter cards, canonical URLs, structured data
 */
const SEO = ({
  title,
  description,
  keywords,
  image = 'https://creatives-takeover.com/lovable-uploads/new-favicon.png',
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  canonical,
  noindex = false,
  structuredData,
}: SEOProps) => {
  const baseUrl = 'https://creatives-takeover.com';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const canonicalUrl = canonical || fullUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  // Ensure title is optimized length (50-60 chars)
  const optimizedTitle = title.length > 60 ? `${title.substring(0, 57)}...` : title;
  
  // Ensure description is optimized length (150-160 chars)
  const optimizedDescription = description.length > 160 
    ? `${description.substring(0, 157)}...` 
    : description;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{optimizedTitle}</title>
      <meta name="description" content={optimizedDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={optimizedTitle} />
      <meta property="og:description" content={optimizedDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content="Creatives Takeover" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={optimizedTitle} />
      <meta name="twitter:description" content={optimizedDescription} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:site" content="@CreativesTakeover" />
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(structuredData) ? structuredData : [structuredData])}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;

// Helper function to create Organization schema
export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Creatives Takeover",
  "url": "https://creatives-takeover.com",
  "logo": "https://creatives-takeover.com/lovable-uploads/new-favicon.png",
  "description": "The creative entrepreneur's AI co-founder. Go from scattered ideas to profitable launch in 30 days.",
  "sameAs": [
    "https://twitter.com/CreativesTakeover",
    "https://linkedin.com/company/creatives-takeover"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@creatives-takeover.com"
  }
});

// Helper function to create WebSite schema with search
export const createWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Creatives Takeover",
  "url": "https://creatives-takeover.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://creatives-takeover.com/news?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
});

// Helper function to create Breadcrumb schema
export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": `https://creatives-takeover.com${item.url}`
  }))
});

// Helper function to create Article schema
export const createArticleSchema = (article: {
  title: string;
  description: string;
  image?: string;
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.title,
  "description": article.description,
  "image": article.image || "https://creatives-takeover.com/lovable-uploads/new-favicon.png",
  "author": {
    "@type": "Person",
    "name": article.author
  },
  "publisher": {
    "@type": "Organization",
    "name": "Creatives Takeover",
    "logo": {
      "@type": "ImageObject",
      "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
    }
  },
  "datePublished": article.publishedTime,
  "dateModified": article.modifiedTime || article.publishedTime,
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": `https://creatives-takeover.com${article.url}`
  }
});

// Helper function to create FAQPage schema
export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// Helper function to create Product schema
export const createProductSchema = (product: {
  name: string;
  description: string;
  price: number;
  currency?: string;
  image?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  "image": product.image || "https://creatives-takeover.com/lovable-uploads/new-favicon.png",
  "offers": {
    "@type": "Offer",
    "price": product.price,
    "priceCurrency": product.currency || "USD",
    "availability": "https://schema.org/InStock"
  }
});

// Helper function to create SoftwareApplication schema
export const createSoftwareSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Creatives Takeover Dream2Plan",
  "applicationCategory": "BusinessApplication",
  "description": "AI-powered business planning tool that helps creative entrepreneurs go from scattered ideas to profitable launch in 30 days.",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "15000"
  }
});
