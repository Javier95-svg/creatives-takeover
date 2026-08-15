import {
  DEFAULT_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
  breadcrumb,
  escapeHtml,
  generateSlug,
  renderSeoDocument,
  type PublicSeoDocument,
} from './_seo';

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const apiHeaders = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

type EntityType = 'marketplace' | 'service' | 'mentor' | 'cofounder' | 'profile';

async function getJson(path: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: apiHeaders });
  if (!response.ok) return null;
  return response.json();
}

async function postRpc(name: string, body: object): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(body),
  });
  if (!response.ok) return null;
  return response.json();
}

function organizationRef() {
  return { '@id': `${SITE_ORIGIN}/#organization` };
}

function marketplaceDocument(services: any[]): PublicSeoDocument {
  const canonical = `${SITE_ORIGIN}/marketplace`;
  const items = services.map((service, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'Service',
      '@id': `${SITE_ORIGIN}/marketplace/${service.slug}#service`,
      name: service.name,
      description: service.description,
      url: `${SITE_ORIGIN}/marketplace/${service.slug}`,
      serviceType: service.category,
      provider: service.delivered_by_name ? { '@type': 'Person', name: service.delivered_by_name } : organizationRef(),
    },
  }));
  return {
    title: 'Founder Service Marketplace | Creatives Takeover',
    description: 'Browse founder-ready services for sales, marketing, operations, automation, and technical support from specialists who understand early-stage companies.',
    canonical,
    schema: [
      breadcrumb([{ name: 'Home', url: '/' }, { name: 'Founder Service Marketplace', url: '/marketplace' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection`,
        name: 'Founder Service Marketplace',
        description: 'Curated startup services for early-stage founders.',
        url: canonical,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntity: { '@type': 'ItemList', '@id': `${canonical}#items`, numberOfItems: items.length, itemListElement: items },
      },
    ],
    fallbackHtml: `<header><p>${SITE_NAME}</p></header><article><h1>Founder services that move the business forward</h1><p>Compare curated startup services and contact specialists for practical execution support.</p><section><h2>Active founder services</h2><ul>${services.map((service) => `<li><a href="/marketplace/${escapeHtml(service.slug)}">${escapeHtml(service.name)}</a> — ${escapeHtml(service.description)}</li>`).join('')}</ul></section></article>`,
  };
}

function serviceDocument(service: any): PublicSeoDocument {
  const path = `/marketplace/${service.slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const description = String(service.description || `${service.name} on the Creatives Takeover founder service marketplace.`);
  return {
    title: `${service.name} | Founder Service Marketplace`,
    description,
    canonical,
    image: service.banner_url,
    schema: [
      breadcrumb([{ name: 'Home', url: '/' }, { name: 'Marketplace', url: '/marketplace' }, { name: service.name, url: path }]),
      {
        '@context': 'https://schema.org', '@type': 'Service', '@id': `${canonical}#service`, name: service.name,
        description, url: canonical, image: service.banner_url || DEFAULT_IMAGE, serviceType: service.category, areaServed: 'Worldwide',
        provider: service.delivered_by_name ? { '@type': 'Person', name: service.delivered_by_name } : organizationRef(),
      },
    ],
    fallbackHtml: `<article><p><a href="/marketplace">Founder Service Marketplace</a></p><h1>${escapeHtml(service.name)}</h1>${service.delivered_by_name ? `<p>Delivered by ${escapeHtml(service.delivered_by_name)}</p>` : ''}<p>${escapeHtml(description)}</p><h2>Service category</h2><p>${escapeHtml(service.category)}</p></article>`,
  };
}

function mentorDocument(mentor: any): PublicSeoDocument {
  const slug = generateSlug(mentor.name);
  const path = `/mentorship/${slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const description = String(mentor.bio || `${mentor.name} is a startup mentor on Creatives Takeover.`);
  const sameAs = [mentor.linkedin_url, mentor.twitter_x_url, mentor.website_url].filter(Boolean);
  const person = {
    '@context': 'https://schema.org', '@type': 'Person', '@id': `${canonical}#person`, name: mentor.name,
    description, url: canonical, image: mentor.picture || DEFAULT_IMAGE, jobTitle: 'Startup Mentor', sameAs,
    knowsAbout: Array.isArray(mentor.expertise) ? mentor.expertise : [],
  };
  return {
    title: `${mentor.name} | Startup Mentor`, description, canonical, image: mentor.picture,
    schema: [breadcrumb([{ name: 'Home', url: '/' }, { name: 'Mentorship', url: '/mentorship' }, { name: mentor.name, url: path }]), person, {
      '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${canonical}#webpage`, name: `${mentor.name} — Startup Mentor`,
      description, url: canonical, mainEntity: { '@id': `${canonical}#person` }, isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    }],
    fallbackHtml: `<article><p><a href="/mentorship">Startup Mentor Marketplace</a></p><h1>${escapeHtml(mentor.name)}</h1><p>${escapeHtml(description)}</p>${Array.isArray(mentor.expertise) && mentor.expertise.length ? `<h2>Areas of expertise</h2><ul>${mentor.expertise.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</article>`,
  };
}

function profileDocument(profile: any): PublicSeoDocument {
  const path = `/profile/${profile.username}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const name = profile.full_name || profile.username;
  const description = String(profile.positioning_line || profile.bio || `${name} is a founder on Creatives Takeover.`);
  const person = {
    '@context': 'https://schema.org', '@type': 'Person', '@id': `${canonical}#person`, name, description,
    url: canonical, image: profile.avatar_url || DEFAULT_IMAGE,
    sameAs: [profile.website_url, profile.linkedin_url, profile.twitter_url, profile.github_url].filter(Boolean),
    ...(profile.startup_name ? { worksFor: { '@type': 'Organization', name: profile.startup_name } } : {}),
  };
  return {
    title: `${name} | Founder Profile`, description, canonical, image: profile.avatar_url, indexable: profile.seo_indexable === true,
    schema: [breadcrumb([{ name: 'Home', url: '/' }, { name, url: path }]), person, {
      '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': `${canonical}#webpage`, name: `${name} — Founder Profile`,
      description, url: canonical, mainEntity: { '@id': `${canonical}#person` }, isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    }],
    fallbackHtml: `<article><h1>${escapeHtml(name)}</h1>${profile.positioning_line ? `<p>${escapeHtml(profile.positioning_line)}</p>` : ''}${profile.bio ? `<h2>About</h2><p>${escapeHtml(profile.bio)}</p>` : ''}${profile.startup_name ? `<h2>Building</h2><p>${escapeHtml(profile.startup_name)}${profile.startup_tagline ? ` — ${escapeHtml(profile.startup_tagline)}` : ''}</p>` : ''}</article>`,
  };
}

function cofounderDocument(listing: any): PublicSeoDocument {
  const path = `/co-founder/listing/${listing.id}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const description = String(listing.summary || listing.headline);
  return {
    title: `${listing.headline} | Co-Founder Marketplace`, description, canonical,
    schema: [breadcrumb([{ name: 'Home', url: '/' }, { name: 'Co-Founder Marketplace', url: '/co-founder' }, { name: listing.headline, url: path }]), {
      '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${canonical}#webpage`, name: listing.headline,
      description, url: canonical, datePublished: listing.publishedAt, dateModified: listing.updatedAt,
      about: listing.startupName ? { '@type': 'Organization', name: listing.startupName } : { '@type': 'Thing', name: 'Co-founder opportunity' },
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    }],
    fallbackHtml: `<article><p><a href="/co-founder">Co-Founder Marketplace</a></p><h1>${escapeHtml(listing.headline)}</h1>${listing.startupName ? `<p>${escapeHtml(listing.startupName)}</p>` : ''}<p>${escapeHtml(description)}</p>${Array.isArray(listing.skillsOffered) ? `<h2>Skills offered</h2><ul>${listing.skillsOffered.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${Array.isArray(listing.skillsSought) ? `<h2>Skills sought</h2><ul>${listing.skillsSought.map((item: string) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</article>`,
  };
}

async function loadDocument(type: EntityType, slug: string): Promise<PublicSeoDocument | null> {
  if (type === 'marketplace') {
    const services = await getJson('services?is_active=eq.true&select=slug,name,description,category,delivered_by_name,banner_url&order=is_featured.desc,name.asc');
    return marketplaceDocument(Array.isArray(services) ? services : []);
  }
  if (!slug) return null;
  if (type === 'service') {
    const rows = await getJson(`services?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=*&limit=1`);
    return Array.isArray(rows) && rows[0] ? serviceDocument(rows[0]) : null;
  }
  if (type === 'mentor') {
    const rows = await getJson('mentors?is_active=eq.true&select=id,name,picture,bio,expertise,linkedin_url,twitter_x_url,website_url,updated_at');
    const mentor = Array.isArray(rows) ? rows.find((item) => generateSlug(item.name) === slug) : null;
    return mentor ? mentorDocument(mentor) : null;
  }
  if (type === 'profile') {
    const rows = await getJson(`public_profiles?username=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
    return Array.isArray(rows) && rows[0] ? profileDocument(rows[0]) : null;
  }
  const result = await postRpc('browse_cofounder_listings_v1', { p_filters: { listingId: slug, includeOwn: true }, p_limit: 1, p_cursor: null });
  const listing = result && Array.isArray(result.items) ? result.items[0] : null;
  return listing ? cofounderDocument(listing) : null;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || '') as EntityType;
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  const shellResponse = await fetch(`${url.origin}/index.html`, { headers: { 'x-public-entity': '1' } });
  const shell = await shellResponse.text();
  if (!SUPABASE_KEY || !['marketplace', 'service', 'mentor', 'cofounder', 'profile'].includes(type)) {
    return new Response(shell, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } });
  }
  const document = await loadDocument(type, slug);
  if (!document) {
    const notFound = renderSeoDocument(shell, {
      title: `Page not found | ${SITE_NAME}`,
      description: 'The requested public profile or listing is unavailable.',
      canonical: `${SITE_ORIGIN}${url.pathname}`,
      indexable: false,
      schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Page not found' },
      fallbackHtml: '<article><h1>Page not found</h1><p>This public profile or listing is unavailable.</p></article>',
    });
    return new Response(notFound, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, s-maxage=60', 'x-robots-tag': 'noindex,follow' } });
  }
  const html = renderSeoDocument(shell, document);
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      'x-robots-tag': document.indexable === false ? 'noindex,follow' : 'index,follow',
    },
  });
}
