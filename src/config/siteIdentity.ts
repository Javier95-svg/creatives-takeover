export const SITE_IDENTITY = {
  name: "Creatives Takeover",
  baseUrl: "https://creatives-takeover.com",
  tagline: "The Founders' Compass",
  description:
    "Creatives Takeover is an AI-powered startup development platform for first-time founders, connecting customer clarity, validation, MVP building, go-to-market execution, traction, and fundraising preparation in one guided system.",
  shortDescription:
    "An AI-powered startup development platform that helps first-time founders move from customer clarity to validation, launch, traction, and fundraising preparation.",
  logoUrl: "https://creatives-takeover.com/favicon-192x192.png",
  imageUrl: "https://creatives-takeover.com/og-image.png",
  supportEmail: "support@creatives-takeover.com",
  founder: {
    name: "Javier Peña",
    jobTitle: "Founder & CEO",
    url: "https://creatives-takeover.com/about#founder",
    sameAs: [
      "https://www.linkedin.com/in/javier-digital-marketing/",
      "https://x.com/JavierForge",
    ],
  },
  sameAs: [
    "https://twitter.com/CreativesTakeover",
    "https://www.linkedin.com/company/creatives-takeover",
    "https://www.instagram.com/creativestakeover.official/",
    "https://www.youtube.com/@CreativesTakeover",
  ],
  address: {
    streetAddress: "71-75 Shelton Street",
    addressLocality: "London",
    addressRegion: "England",
    postalCode: "WC2H 9JQ",
    addressCountry: "GB",
  },
} as const;

export const SITE_AUTHOR = SITE_IDENTITY.founder;
