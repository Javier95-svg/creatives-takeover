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

type EntityType = 'marketplace' | 'service' | 'mentor' | 'cofounder' | 'profile' | 'launch' | 'launches';

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

// Minimum listed launches before /launches is worth indexing. A three-card
// gallery is thin content that also advertises that nobody uses the product.
// Mirrored in src/pages/demo-studio/LaunchGalleryPage.tsx — the edge runtime
// cannot import from src/, so keep the two in sync by hand.
const MIN_GALLERY_SIZE = 12;

function isoDuration(seconds: unknown): string | null {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const minutes = Math.floor(total / 60);
  const remainder = Math.round(total % 60);
  return `PT${minutes > 0 ? `${minutes}M` : ''}${remainder}S`;
}

function launchDocument(project: any): PublicSeoDocument {
  const page = project.demo_studio_launch_pages?.[0] ?? {};
  const path = `/p/${project.slug}`;
  const canonical = `${SITE_ORIGIN}${path}`;
  const headline = String(page.headline || project.tagline || 'demo and founder pitch');
  const title = `${project.name} — ${headline}`;
  const description = String(
    page.subheadline || project.tagline || `See the ${project.name} demo and founder pitch.`,
  );
  const vsls = Array.isArray(project.demo_studio_vsls) ? project.demo_studio_vsls : [];
  const vsl = vsls.find((item: any) => item?.is_primary && item?.loom_embed_url) ?? vsls.find((item: any) => item?.loom_embed_url);
  const duration = vsl ? isoDuration(vsl.duration_seconds) : null;
  const cacheBuster = Date.parse(project.updated_at || '') || 0;

  const schema: object[] = [
    breadcrumb([
      { name: 'Home', url: '/' },
      { name: 'Launches', url: '/launches' },
      { name: project.name, url: path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      name: title,
      description,
      url: canonical,
      dateModified: project.updated_at,
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@type': 'Organization', name: project.name, ...(project.logo_url ? { logo: project.logo_url } : {}) },
      publisher: organizationRef(),
    },
  ];
  // VideoObject only when a playable pitch exists. Emitting it without a real
  // video is a rich-result violation.
  if (vsl?.loom_embed_url) {
    schema.push({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${canonical}#video`,
      name: String(vsl.title || `${project.name} founder pitch`),
      description,
      embedUrl: vsl.loom_embed_url,
      thumbnailUrl: vsl.thumbnail_url || `${SITE_ORIGIN}/og/p/${project.slug}`,
      uploadDate: vsl.created_at,
      ...(duration ? { duration } : {}),
    });
  }

  return {
    title,
    description,
    canonical,
    image: `${SITE_ORIGIN}/og/p/${project.slug}${cacheBuster ? `?v=${cacheBuster}` : ''}`,
    // Founder opt-in. Unlisted pages stay reachable by link but are never indexed.
    indexable: project.launch_listed === true,
    schema,
    fallbackHtml: `<article><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(description)}</p>${project.tagline ? `<h2>What it is</h2><p>${escapeHtml(project.tagline)}</p>` : ''}${project.category ? `<h2>Category</h2><p>${escapeHtml(project.category)}</p>` : ''}${vsl?.title ? `<h2>Founder pitch</h2><p>${escapeHtml(vsl.title)}</p>` : ''}<h2>Get early access</h2><p>${escapeHtml(page.cta_label || 'Join the waitlist')} — open the page to join the list.</p><p><a href="/launches">More founder launches on Creatives Takeover</a> · <a href="/demo-studio">Build a launch page like this one</a></p></article>`,
  };
}

function launchesDocument(projects: any[]): PublicSeoDocument {
  const canonical = `${SITE_ORIGIN}/launches`;
  const description = 'Real products founders are validating right now on Creatives Takeover. Each launch page carries an interactive demo, a founder pitch, and an early access list.';
  const items = projects.map((project, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'WebPage',
      '@id': `${SITE_ORIGIN}/p/${project.slug}#webpage`,
      name: project.name,
      description: project.tagline || project.name,
      url: `${SITE_ORIGIN}/p/${project.slug}`,
    },
  }));
  return {
    title: 'Founder Launches | Creatives Takeover',
    description,
    canonical,
    // Below the threshold the page renders a "be one of the first" state, which
    // is not worth indexing.
    indexable: projects.length >= MIN_GALLERY_SIZE,
    schema: [
      breadcrumb([{ name: 'Home', url: '/' }, { name: 'Founder Launches', url: '/launches' }]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection`,
        name: 'Founder Launches',
        description,
        url: canonical,
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
        mainEntity: { '@type': 'ItemList', '@id': `${canonical}#items`, numberOfItems: items.length, itemListElement: items },
      },
    ],
    fallbackHtml: `<header><p>${SITE_NAME}</p></header><article><h1>Founder launches</h1><p>${escapeHtml(description)}</p>${projects.length ? `<section><h2>Live launches</h2><ul>${projects.map((project) => `<li><a href="/p/${escapeHtml(project.slug)}">${escapeHtml(project.name)}</a>${project.tagline ? ` — ${escapeHtml(project.tagline)}` : ''}</li>`).join('')}</ul></section>` : ''}<p><a href="/demo-studio">Build your own launch page free</a></p></article>`,
  };
}

async function loadDocument(type: EntityType, slug: string): Promise<PublicSeoDocument | null> {
  if (type === 'marketplace') {
    const services = await getJson('services?is_active=eq.true&select=slug,name,description,category,delivered_by_name,banner_url&order=is_featured.desc,name.asc');
    return marketplaceDocument(Array.isArray(services) ? services : []);
  }
  if (type === 'launches') {
    const projects = await getJson('demo_studio_projects?launch_published=eq.true&launch_listed=eq.true&select=slug,name,tagline,logo_url,category,updated_at&order=updated_at.desc&limit=60');
    return launchesDocument(Array.isArray(projects) ? projects : []);
  }
  if (!slug) return null;
  if (type === 'launch') {
    // RLS lets the anon key read the project only when launch_published = true,
    // and the embedded rows only through that published parent, so this single
    // request is self-securing.
    const rows = await getJson(
      `demo_studio_projects?slug=eq.${encodeURIComponent(slug)}&launch_published=eq.true&limit=1`
      + '&select=id,name,tagline,logo_url,category,slug,launch_listed,updated_at,'
      + 'demo_studio_launch_pages(headline,subheadline,cta_label,theme),'
      + 'demo_studio_vsls(title,loom_embed_url,thumbnail_url,duration_seconds,created_at,is_primary)',
    );
    return Array.isArray(rows) && rows[0] ? launchDocument(rows[0]) : null;
  }
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
  if (!SUPABASE_KEY || !['marketplace', 'service', 'mentor', 'cofounder', 'profile', 'launch', 'launches'].includes(type)) {
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
