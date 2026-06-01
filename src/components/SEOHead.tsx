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
    title: 'Canada Energy Dashboard',
    description: 'Monitor Canadian energy systems with live-when-available data from IESO, AESO, and provincial grids plus explicit freshness labeling.',
    path: '/dashboard',
    keywords: ['Canada energy dashboard', 'IESO electricity data', 'AESO grid', 'Ontario electricity'],
    schema: PAGE_SCHEMAS.dashboard,
    datasetSchema: DATASET_SCHEMAS.ontarioDemand
  },
  indigenous: {
    title: 'Indigenous Energy Project Workflows',
    description: 'Track Indigenous energy projects with FPIC review workflow language, OCAP-aligned workflow framing, owner-supplied governance markers, and explicit review fields.',
    path: '/indigenous',
    keywords: ['Indigenous energy', 'FPIC review workflow', 'OCAP-aligned workflow', 'First Nations energy', 'governance review markers'],
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
  },
  funderReporting: {
    title: 'Indigenous Funder Reporting Dashboard',
    description: 'Auto-generate Wah-ila-toos, CERRC, and Northern REACHE quarterly reports with OCAP-aligned workflow language, explicit governance fields, and community review before external sharing.',
    path: '/funder-reporting',
    keywords: ['Indigenous energy reporting', 'Wah-ila-toos report', 'CERRC reporting', 'OCAP-aligned workflow', 'First Nations energy projects', 'funder reporting dashboard']
  },
  roiCalculator: {
    title: 'Alberta TIER Scenario Planning Calculator',
    description: 'Build source-dated Alberta TIER planning estimates with buyer validation required. Compare fund-price assumptions, disclosed scenario inputs, and Direct Investment pathway notes.',
    path: '/roi-calculator',
    keywords: ['TIER calculator', 'Alberta TIER scenario planning', 'TIER credit ledger', 'EPC offset Alberta', 'Direct Investment TIER']
  },
  municipal: {
    title: 'Municipal Climate Tools | Alberta Energy Compliance for Municipalities',
    description: 'CEIP supports Alberta municipal climate planning with proof-pack workflows for methane program review, TIER scenario notes, GHG tracking, and procurement threshold checks.',
    path: '/municipal',
    keywords: ['municipal climate tools Alberta', 'TIER compliance municipality', 'GHG reporting municipal', 'MCCAC energy tools', 'FCM Green Municipal Fund']
  }
};

export default SEOHead;
