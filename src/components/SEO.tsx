import { Helmet } from 'react-helmet-async';
import { SITE_AUTHOR, SITE_IDENTITY } from '@/config/siteIdentity';

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
  image = 'https://creatives-takeover.com/og-image.png',
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
  const baseUrl = SITE_IDENTITY.baseUrl;
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const canonicalUrl = canonical || fullUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  // Titles and descriptions are deliberately authored at the route level. Do
  // not cut them mechanically: a literal ellipsis hides the brand/topic and
  // creates different metadata between the source HTML and hydrated page.
  const optimizedTitle = title.trim();
  const optimizedDescription = description.trim();

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{optimizedTitle}</title>
      <meta name="description" content={optimizedDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
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
      <meta property="og:site_name" content={SITE_IDENTITY.name} />
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

const createOrganizationEntity = () => ({
  "@type": "Organization",
  "@id": `${SITE_IDENTITY.baseUrl}/#organization`,
  "name": SITE_IDENTITY.name,
  "url": SITE_IDENTITY.baseUrl,
  "logo": {
    "@type": "ImageObject",
    "url": SITE_IDENTITY.logoUrl,
    "width": 192,
    "height": 192,
  },
  "description": SITE_IDENTITY.description,
  "founder": {
    "@type": "Person",
    "@id": `${SITE_IDENTITY.baseUrl}/about#founder`,
    "name": SITE_AUTHOR.name,
    "jobTitle": SITE_AUTHOR.jobTitle,
    "url": SITE_AUTHOR.url,
    "sameAs": [...SITE_AUTHOR.sameAs],
  },
  "sameAs": [...SITE_IDENTITY.sameAs],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": SITE_IDENTITY.supportEmail,
  },
  "address": {
    "@type": "PostalAddress",
    ...SITE_IDENTITY.address,
  },
});

// Helper function to create Organization schema
export const createOrganizationSchema = () => ({
  "@context": "https://schema.org",
  ...createOrganizationEntity(),
});

// Helper function to create WebSite schema with search
export const createWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_IDENTITY.baseUrl}/#website`,
  "name": SITE_IDENTITY.name,
  "url": SITE_IDENTITY.baseUrl,
  "description": SITE_IDENTITY.shortDescription,
  "potentialAction": {
    "@type": "SearchAction",
    "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_IDENTITY.baseUrl}/answers?q={search_term_string}` },
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
    "item": `${SITE_IDENTITY.baseUrl}${item.url}`
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
    "image": article.image || "https://creatives-takeover.com/og-image.png",
    "author": {
      "@type": "Person",
      "name": article.author,
      ...(article.author === SITE_AUTHOR.name
        ? { "@id": `${SITE_IDENTITY.baseUrl}/about#founder`, "url": SITE_AUTHOR.url }
        : {})
    },
    "publisher": createOrganizationEntity(),
    "datePublished": article.publishedTime,
    ...(article.modifiedTime ? { "dateModified": article.modifiedTime } : {}),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_IDENTITY.baseUrl}${article.url}`
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

// Helper function to create HowTo schema (unlocks rich step-by-step results in Google)
export const createHowToSchema = (params: {
  name: string;
  description: string;
  steps: Array<{ title: string; description: string }>;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": params.name,
  "description": params.description,
  "url": `${SITE_IDENTITY.baseUrl}${params.url}`,
  "publisher": createOrganizationEntity(),
  "step": params.steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.title,
    "text": step.description,
    "url": `${SITE_IDENTITY.baseUrl}${params.url}#step-${index + 1}`
  }))
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
  "image": product.image || SITE_IDENTITY.imageUrl,
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
  "name": SITE_IDENTITY.name,
  "applicationCategory": "BusinessApplication",
  "description": SITE_IDENTITY.description,
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
  // NOTE: aggregateRating intentionally omitted. Fabricated review ratings in
  // structured data violate Google's guidelines and risk a manual action.
  // Re-add only when backed by real, on-page user reviews.
});

// Helper function to create SoftwareApplication schema for specific tools
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
  "url": `${SITE_IDENTITY.baseUrl}${app.url}`,
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
  "description": SITE_IDENTITY.description,
  "url": `${SITE_IDENTITY.baseUrl}/about`,
  "mainEntity": createOrganizationEntity(),
});

// Helper function to create Service/ServiceList schema
export const createServiceSchema = (services?: Array<{ name: string; description: string }>) => {
  if (services && services.length > 0) {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Startup Development Support",
      "name": "Creatives Takeover Founder Platform",
      "description": SITE_IDENTITY.description,
      "provider": createOrganizationEntity(),
      "areaServed": "Worldwide",
      "availableChannel": {
        "@type": "ServiceChannel",
        "serviceUrl": `${SITE_IDENTITY.baseUrl}/build`
      },
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Founder Tools and Support",
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
    "serviceType": "Startup Development Support",
    "name": "Creatives Takeover Founder Platform",
    "description": SITE_IDENTITY.description,
    "provider": createOrganizationEntity(),
    "areaServed": "Worldwide",
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": `${SITE_IDENTITY.baseUrl}/build`
    }
  };
};

// Helper function to create LocalBusiness/ContactPage schema
export const createLocalBusinessSchema = () => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": SITE_IDENTITY.name,
  "image": SITE_IDENTITY.imageUrl,
  "url": SITE_IDENTITY.baseUrl,
  "telephone": "",
  "email": SITE_IDENTITY.supportEmail,
  "address": {
    "@type": "PostalAddress",
    ...SITE_IDENTITY.address,
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
  "sameAs": [...SITE_IDENTITY.sameAs]
});

// Helper function to create ContactPage schema
export const createContactPageSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": `Contact ${SITE_IDENTITY.name}`,
  "description": "Contact Creatives Takeover. We're here to help with product questions, partnerships, and support.",
  "url": `${SITE_IDENTITY.baseUrl}/contact`,
  "mainEntity": createLocalBusinessSchema()
});
