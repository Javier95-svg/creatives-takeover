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
  googleSiteVerification?: string;
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
  googleSiteVerification,
}: SEOProps) => {
  const baseUrl = 'https://creatives-takeover.com';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const canonicalUrl = canonical || fullUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;
  const robotsContent = noindex
    ? 'noindex,nofollow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

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
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      {googleSiteVerification && <meta name="google-site-verification" content={googleSiteVerification} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={optimizedTitle} />
      <meta property="og:description" content={optimizedDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:secure_url" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={optimizedTitle} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Creatives Takeover" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && type === 'article' && <meta property="article:author" content={author} />}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={optimizedTitle} />
      <meta name="twitter:description" content={optimizedDescription} />
      <meta name="twitter:image" content={fullImageUrl} />
      <meta name="twitter:image:alt" content={optimizedTitle} />
      <meta name="twitter:site" content="@CreativesTakeover" />
      <meta name="twitter:creator" content="@CreativesTakeover" />
      
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
    "target": "https://creatives-takeover.com/insighta?search={search_term_string}",
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
  keywords?: string[];
  articleSection?: string;
}) => {
  const schema: any = {
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
  };

  // Add keywords if provided (formatted without # prefix)
  if (article.keywords && article.keywords.length > 0) {
    schema.keywords = article.keywords.map(k => k.replace('#', '')).join(', ');
  }

  // Add articleSection if provided
  if (article.articleSection) {
    schema.articleSection = article.articleSection;
  }

  return schema;
};

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

export const createSoftwareApplicationSchema = (app: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  featureList?: string[];
  price?: string;
  priceCurrency?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": app.name,
  "applicationCategory": app.applicationCategory || "BusinessApplication",
  "description": app.description,
  "operatingSystem": "Web",
  "url": `https://creatives-takeover.com${app.url}`,
  ...(app.featureList && app.featureList.length > 0
    ? { "featureList": app.featureList }
    : {}),
  "offers": {
    "@type": "Offer",
    "price": app.price || "0",
    "priceCurrency": app.priceCurrency || "USD",
    "availability": "https://schema.org/InStock"
  }
});

// Helper function to create AboutPage schema
export const createAboutPageSchema = () => ({
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Creatives Takeover",
  "description": "Learn about Creatives Takeover's mission and vision to empower creators and solopreneurs with AI and no-code solutions.",
  "url": "https://creatives-takeover.com/about",
  "mainEntity": {
    "@type": "Organization",
    "name": "Creatives Takeover",
    "url": "https://creatives-takeover.com",
    "logo": "https://creatives-takeover.com/lovable-uploads/new-favicon.png",
    "description": "The creative entrepreneur's AI co-founder. Go from scattered ideas to profitable launch in 30 days.",
    "sameAs": [
      "https://twitter.com/CreativesTakeover",
      "https://linkedin.com/company/creatives-takeover",
      "https://www.instagram.com/creativestakeover.official/",
      "https://www.youtube.com/@CreativesTakeover"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "admin@creatives-takeover.com"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "71-75, Shelton Street",
      "addressLocality": "Covent Garden",
      "addressRegion": "London",
      "postalCode": "WC2H 9JQ",
      "addressCountry": "GB"
    }
  }
});

// Helper function to create Service/ServiceList schema
export const createServiceSchema = (services?: Array<{ name: string; description: string }>) => {
  if (services && services.length > 0) {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Creative Subscription Service",
      "name": "Creatives Takeover Services",
      "description": "Transform your creative workflow with our creative subscription service. Unlimited design access, AI-powered tools, and premium features for modern creatives.",
      "provider": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "url": "https://creatives-takeover.com"
      },
      "areaServed": "Worldwide",
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": "https://creatives-takeover.com/services"
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Creative Services",
        "itemListElement": services.map((service, index) => ({
          "@type": "OfferCatalogItem",
          "position": index + 1,
          "itemOffered": {
            "@type": "Service",
            "name": service.name,
            "description": service.description
          }
        }))
      }
    };
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Creative Subscription Service",
    "name": "Creatives Takeover Services",
    "description": "Transform your creative workflow with our creative subscription service. Unlimited design access, AI-powered tools, and premium features for modern creatives.",
    "provider": {
      "@type": "Organization",
      "name": "Creatives Takeover",
      "url": "https://creatives-takeover.com"
    },
    "areaServed": "Worldwide",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://creatives-takeover.com/services"
    }
  };
};

// Helper function to create LocalBusiness/ContactPage schema
export const createLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Creatives Takeover",
  "image": "https://creatives-takeover.com/lovable-uploads/new-favicon.png",
  "url": "https://creatives-takeover.com",
  "telephone": "",
  "email": "admin@creatives-takeover.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "71-75, Shelton Street",
    "addressLocality": "Covent Garden",
    "addressRegion": "London",
    "postalCode": "WC2H 9JQ",
    "addressCountry": "GB"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "51.5134",
    "longitude": "-0.1236"
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday"
    ],
    "opens": "09:00",
    "closes": "17:00"
  },
  "sameAs": [
    "https://twitter.com/CreativesTakeover",
    "https://linkedin.com/company/creatives-takeover",
    "https://www.instagram.com/creativestakeover.official/",
    "https://www.youtube.com/@CreativesTakeover"
  ]
});

// Helper function to create ContactPage schema
export const createContactPageSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Creatives Takeover",
  "description": "Contact Creatives Takeover. We're here to help with product questions, partnerships, and support.",
  "url": "https://creatives-takeover.com/contact",
  "mainEntity": createLocalBusinessSchema()
});
