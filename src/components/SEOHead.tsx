/**
 * SEOHead Component
 * 
 * Injects per-page SEO meta tags, JSON-LD structured data, and hreflang tags.
 * Uses document.head manipulation for SPA compatibility.
 * 
 * Addresses Gap #10: SEO Per-Page Schema (MEDIUM Priority)
 */

import { useEffect } from 'react';
import { PAGE_SCHEMAS, DATASET_SCHEMAS, generateSEOMeta } from '../lib/seo';

export interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  schema?: object;
  datasetSchema?: object;
}

/**
 * Inject or update a meta tag in document head
 */
function setMetaTag(attr: 'name' | 'property', value: string, content: string): void {
  let element = document.querySelector(`meta[${attr}="${value}"]`) as HTMLMetaElement | null;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }
  
  element.content = content;
}

/**
 * Inject or update a link tag in document head
 */
function setLinkTag(rel: string, href: string, hreflang?: string): void {
  const selector = hreflang 
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  
  let element = document.querySelector(selector) as HTMLLinkElement | null;
  
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    if (hreflang) element.hreflang = hreflang;
    document.head.appendChild(element);
  }
  
  element.href = href;
}

/**
 * Inject JSON-LD structured data
 */
function setJsonLd(id: string, data: object): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  
  script.textContent = JSON.stringify(data);
}

/**
 * SEOHead component - injects SEO tags on mount and cleans up on unmount
 */
export function SEOHead({
  title,
  description,
  path,
  keywords = [],
  image,
  schema,
  datasetSchema
}: SEOHeadProps): null {
  useEffect(() => {
    const seoMeta = generateSEOMeta({ title, description, path, keywords, image });
    
    // Set document title
    const originalTitle = document.title;
    document.title = seoMeta.title;
    
    // Set meta tags
    seoMeta.meta.forEach(tag => {
      if (tag.name) {
        setMetaTag('name', tag.name, tag.content);
      } else if (tag.property) {
        setMetaTag('property', tag.property, tag.content);
      }
    });
    
    // Set link tags (canonical, hreflang)
    seoMeta.link.forEach(link => {
      setLinkTag(link.rel, link.href, link.hreflang);
    });
    
    // Set JSON-LD schema if provided
    if (schema) {
      setJsonLd('seo-page-schema', schema);
    }
    
    if (datasetSchema) {
      setJsonLd('seo-dataset-schema', datasetSchema);
    }
    
    // Cleanup on unmount - restore original title
    return () => {
      document.title = originalTitle;
    };
  }, [title, description, path, keywords, image, schema, datasetSchema]);
  
  return null;
}

/**
 * Pre-configured SEO heads for key pages
 */
export const SEO_CONFIGS = {
  dashboard: {
    title: 'Real-Time Energy Dashboard',
    description: 'Live monitoring of Canadian energy systems with real-time data from IESO, AESO, and provincial grids.',
    path: '/dashboard',
    keywords: ['Canada energy dashboard', 'IESO real-time data', 'AESO grid', 'Ontario electricity'],
    schema: PAGE_SCHEMAS.dashboard,
    datasetSchema: DATASET_SCHEMAS.ontarioDemand
  },
  indigenous: {
    title: 'Indigenous Energy Sovereignty',
    description: 'Track Indigenous energy projects, FPIC compliance, and UNDRIP implementation across Canada.',
    path: '/indigenous',
    keywords: ['Indigenous energy', 'UNDRIP compliance', 'FPIC', 'OCAP', 'First Nations energy'],
    schema: PAGE_SCHEMAS.indigenous,
    datasetSchema: DATASET_SCHEMAS.indigenousProjects
  },
  climatePolicy: {
    title: 'Canadian Climate Policy Dashboard',
    description: 'Comprehensive tracking of Canadian climate policies, carbon pricing, CCUS projects, and net-zero pathways.',
    path: '/climate-policy',
    keywords: ['Canadian climate policy', 'carbon pricing Canada', 'CCUS projects', 'net-zero'],
    schema: PAGE_SCHEMAS.climatePolicy
  },
  employers: {
    title: 'For Employers - Hire Energy Professionals',
    description: 'Connect with pre-qualified energy professionals. LMIA-ready capability profiles and verified credentials.',
    path: '/employers',
    keywords: ['energy jobs Canada', 'LMIA energy sector', 'hire energy analysts'],
    schema: PAGE_SCHEMAS.employers
  },
  incubators: {
    title: 'For Incubators & CTNs',
    description: 'Partner with CEIP for energy tech training programs. Economic benefit calculator for DIA-SOURCE priority.',
    path: '/incubators',
    keywords: ['energy incubator Canada', 'CTN training', 'DIA-SOURCE'],
    schema: PAGE_SCHEMAS.incubators
  },
  aiDataCentre: {
    title: 'AI Data Centre Energy Dashboard',
    description: 'Track AI data centre energy demand, AESO interconnection queue, and grid impact scenarios for Alberta.',
    path: '/dashboard#ai-datacentre',
    keywords: ['AI data centre energy', 'AESO queue', 'Alberta grid', 'data centre power']
  },
  resilience: {
    title: 'Grid Resilience & Crisis Scenarios',
    description: 'Model grid resilience under emergency scenarios including wildfires, heatwaves, and cyberattacks.',
    path: '/resilience',
    keywords: ['grid resilience', 'energy crisis simulation', 'blackout prevention', 'emergency preparedness']
  },
  about: {
    title: 'About CEIP',
    description: 'Learn about the Canada Energy Intelligence Platform mission, team, and technology stack.',
    path: '/about',
    keywords: ['CEIP about', 'Canada energy platform', 'energy analytics team']
  },
  pricing: {
    title: 'Pricing & Plans',
    description: 'Explore CEIP subscription tiers for individuals, teams, and enterprises. API access and custom solutions.',
    path: '/pricing',
    keywords: ['CEIP pricing', 'energy data subscription', 'API access plans']
  }
};

export default SEOHead;
