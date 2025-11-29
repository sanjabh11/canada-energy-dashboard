/**
 * SEO Utilities for CEIP
 * 
 * Provides per-page JSON-LD schema generation, hreflang tags,
 * and canonical URL management.
 * 
 * Addresses Gap #10: SEO Per-Page Schema (MEDIUM Priority)
 */

export interface DatasetSchema {
  name: string;
  description: string;
  url: string;
  keywords: string[];
  creator: string;
  dateModified?: string;
  temporalCoverage?: string;
  spatialCoverage?: string;
  license?: string;
  distribution?: {
    contentUrl: string;
    encodingFormat: string;
  }[];
}

export interface PageSchema {
  type: 'WebPage' | 'Dataset' | 'Article' | 'FAQPage' | 'HowTo';
  name: string;
  description: string;
  url: string;
  keywords?: string[];
  datePublished?: string;
  dateModified?: string;
  author?: string;
  image?: string;
  breadcrumb?: { name: string; url: string }[];
}

/**
 * Generate JSON-LD structured data for a Dataset
 */
export function generateDatasetSchema(dataset: DatasetSchema): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: dataset.name,
    description: dataset.description,
    url: dataset.url,
    keywords: dataset.keywords.join(', '),
    creator: {
      '@type': 'Organization',
      name: dataset.creator,
      url: 'https://canada-energy.netlify.app/'
    },
    dateModified: dataset.dateModified || new Date().toISOString().split('T')[0],
    temporalCoverage: dataset.temporalCoverage || '2020/2025',
    spatialCoverage: dataset.spatialCoverage || 'Canada',
    license: dataset.license || 'https://creativecommons.org/licenses/by/4.0/',
    distribution: dataset.distribution || [
      {
        '@type': 'DataDownload',
        contentUrl: `${dataset.url}/export`,
        encodingFormat: 'text/csv'
      }
    ],
    isAccessibleForFree: true,
    inLanguage: ['en-CA', 'fr-CA']
  };
}

/**
 * Generate JSON-LD structured data for a WebPage
 */
export function generatePageSchema(page: PageSchema): object {
  const baseSchema: any = {
    '@context': 'https://schema.org',
    '@type': page.type,
    name: page.name,
    description: page.description,
    url: page.url,
    inLanguage: 'en-CA',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Canada Energy Intelligence Platform',
      url: 'https://canada-energy.netlify.app/'
    }
  };

  if (page.keywords) {
    baseSchema.keywords = page.keywords.join(', ');
  }

  if (page.datePublished) {
    baseSchema.datePublished = page.datePublished;
  }

  if (page.dateModified) {
    baseSchema.dateModified = page.dateModified;
  }

  if (page.author) {
    baseSchema.author = {
      '@type': 'Organization',
      name: page.author
    };
  }

  if (page.image) {
    baseSchema.image = page.image;
  }

  if (page.breadcrumb && page.breadcrumb.length > 0) {
    baseSchema.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumb.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  return baseSchema;
}

/**
 * Pre-defined schemas for key CEIP pages
 */
export const PAGE_SCHEMAS = {
  dashboard: generatePageSchema({
    type: 'WebPage',
    name: 'Real-Time Energy Dashboard - Canada Energy Intelligence Platform',
    description: 'Live monitoring of Canadian energy systems with real-time data from IESO, AESO, and provincial grids. Track demand, generation mix, and pricing.',
    url: 'https://canada-energy.netlify.app/dashboard',
    keywords: ['Canada energy dashboard', 'IESO real-time data', 'AESO grid', 'Ontario electricity demand', 'Alberta power prices'],
    breadcrumb: [
      { name: 'Home', url: 'https://canada-energy.netlify.app/' },
      { name: 'Dashboard', url: 'https://canada-energy.netlify.app/dashboard' }
    ]
  }),

  indigenous: generatePageSchema({
    type: 'WebPage',
    name: 'Indigenous Energy Sovereignty - Canada Energy Intelligence Platform',
    description: 'Track Indigenous energy projects, FPIC compliance, and UNDRIP implementation across Canada. OCAP® compliant data governance.',
    url: 'https://canada-energy.netlify.app/indigenous',
    keywords: ['Indigenous energy', 'UNDRIP compliance', 'FPIC', 'OCAP', 'First Nations energy projects', 'Indigenous data sovereignty'],
    breadcrumb: [
      { name: 'Home', url: 'https://canada-energy.netlify.app/' },
      { name: 'Indigenous Energy', url: 'https://canada-energy.netlify.app/indigenous' }
    ]
  }),

  climatePolicy: generatePageSchema({
    type: 'WebPage',
    name: 'Canadian Climate Policy Dashboard - Canada Energy Intelligence Platform',
    description: 'Comprehensive tracking of Canadian climate policies, carbon pricing, CCUS projects, and net-zero pathways.',
    url: 'https://canada-energy.netlify.app/climate-policy',
    keywords: ['Canadian climate policy', 'carbon pricing Canada', 'CCUS projects', 'net-zero Canada', 'Pathways Alliance'],
    breadcrumb: [
      { name: 'Home', url: 'https://canada-energy.netlify.app/' },
      { name: 'Climate Policy', url: 'https://canada-energy.netlify.app/climate-policy' }
    ]
  }),

  employers: generatePageSchema({
    type: 'WebPage',
    name: 'For Employers - Hire Energy Professionals - Canada Energy Intelligence Platform',
    description: 'Connect with pre-qualified energy professionals. LMIA-ready capability profiles, NOC codes, and verified credentials for Canadian energy sector hiring.',
    url: 'https://canada-energy.netlify.app/employers',
    keywords: ['energy jobs Canada', 'LMIA energy sector', 'hire energy analysts', 'decarbonization specialists', 'energy credentials'],
    breadcrumb: [
      { name: 'Home', url: 'https://canada-energy.netlify.app/' },
      { name: 'For Employers', url: 'https://canada-energy.netlify.app/employers' }
    ]
  }),

  incubators: generatePageSchema({
    type: 'WebPage',
    name: 'For Incubators & CTNs - Canada Energy Intelligence Platform',
    description: 'Partner with CEIP for energy tech training programs. Economic benefit calculator for DIA-SOURCE priority processing.',
    url: 'https://canada-energy.netlify.app/incubators',
    keywords: ['energy incubator Canada', 'CTN training', 'DIA-SOURCE', 'energy tech accelerator', 'clean tech training'],
    breadcrumb: [
      { name: 'Home', url: 'https://canada-energy.netlify.app/' },
      { name: 'For Incubators', url: 'https://canada-energy.netlify.app/incubators' }
    ]
  })
};

/**
 * Pre-defined Dataset schemas for key CEIP datasets
 */
export const DATASET_SCHEMAS = {
  ontarioDemand: generateDatasetSchema({
    name: 'Ontario Electricity Demand Dataset',
    description: 'Real-time and historical electricity demand data for Ontario, Canada. Sourced from IESO (Independent Electricity System Operator).',
    url: 'https://canada-energy.netlify.app/dashboard',
    keywords: ['Ontario electricity', 'IESO demand', 'power consumption', 'grid load', 'real-time energy'],
    creator: 'Canada Energy Intelligence Platform',
    temporalCoverage: '2020/2025',
    spatialCoverage: 'Ontario, Canada'
  }),

  albertaGrid: generateDatasetSchema({
    name: 'Alberta Electricity Grid Dataset',
    description: 'Real-time supply, demand, and pricing data for Alberta electricity market. Sourced from AESO (Alberta Electric System Operator).',
    url: 'https://canada-energy.netlify.app/dashboard',
    keywords: ['Alberta electricity', 'AESO data', 'pool price', 'power generation', 'Alberta grid'],
    creator: 'Canada Energy Intelligence Platform',
    temporalCoverage: '2020/2025',
    spatialCoverage: 'Alberta, Canada'
  }),

  provincialGeneration: generateDatasetSchema({
    name: 'Canadian Provincial Generation Mix Dataset',
    description: 'Electricity generation by source type across Canadian provinces. Includes hydro, nuclear, wind, solar, natural gas, and coal.',
    url: 'https://canada-energy.netlify.app/dashboard',
    keywords: ['Canada generation mix', 'renewable energy', 'provincial electricity', 'hydro power', 'nuclear energy'],
    creator: 'Canada Energy Intelligence Platform',
    temporalCoverage: '2020/2025',
    spatialCoverage: 'Canada'
  }),

  indigenousProjects: generateDatasetSchema({
    name: 'Indigenous Energy Projects Dataset',
    description: 'Tracking Indigenous-led and Indigenous-partnered energy projects across Canada. OCAP® compliant data governance.',
    url: 'https://canada-energy.netlify.app/indigenous',
    keywords: ['Indigenous energy', 'First Nations projects', 'renewable energy Indigenous', 'energy sovereignty'],
    creator: 'Canada Energy Intelligence Platform',
    temporalCoverage: '2015/2025',
    spatialCoverage: 'Canada',
    license: 'https://fnigc.ca/ocap-training/'
  })
};

/**
 * Generate hreflang link tags for bilingual support
 */
export function generateHreflangTags(path: string): string {
  const baseUrl = 'https://canada-energy.netlify.app';
  return `
    <link rel="alternate" hreflang="en-CA" href="${baseUrl}${path}" />
    <link rel="alternate" hreflang="fr-CA" href="${baseUrl}/fr${path}" />
    <link rel="alternate" hreflang="x-default" href="${baseUrl}${path}" />
  `.trim();
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(path: string): string {
  return `https://canada-energy.netlify.app${path}`;
}

/**
 * SEO meta tags generator for React Helmet or similar
 */
export function generateSEOMeta(page: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
}): {
  title: string;
  meta: { name?: string; property?: string; content: string }[];
  link: { rel: string; href: string; hreflang?: string }[];
} {
  const baseUrl = 'https://canada-energy.netlify.app';
  const fullUrl = `${baseUrl}${page.path}`;
  const imageUrl = page.image || `${baseUrl}/favicon.svg`;

  return {
    title: `${page.title} | Canada Energy Intelligence Platform`,
    meta: [
      { name: 'description', content: page.description },
      { name: 'keywords', content: page.keywords?.join(', ') || '' },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:url', content: fullUrl },
      { property: 'og:image', content: imageUrl },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: 'en_CA' },
      { property: 'og:locale:alternate', content: 'fr_CA' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: page.title },
      { name: 'twitter:description', content: page.description },
      { name: 'twitter:image', content: imageUrl }
    ],
    link: [
      { rel: 'canonical', href: fullUrl },
      { rel: 'alternate', href: fullUrl, hreflang: 'en-CA' },
      { rel: 'alternate', href: `${baseUrl}/fr${page.path}`, hreflang: 'fr-CA' },
      { rel: 'alternate', href: fullUrl, hreflang: 'x-default' }
    ]
  };
}
