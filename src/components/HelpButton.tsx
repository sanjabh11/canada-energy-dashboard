// src/components/HelpButton.tsx
// Accessible help button with tooltip and modal integration
// Shows quick tooltip from manifest, opens detailed modal on click

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { HelpModal } from './HelpModal';
import { getCachedManifest, fetchHelpById } from '../lib/helpApi';
import type { HelpContent } from '../lib/helpApi';

// Local fallback content for offline/server failure scenarios
const LOCAL_FALLBACK: Record<string, Omit<HelpContent, 'id'>> = {
  'tab.home': {
    short_text: 'Welcome to the Canadian Energy Information Portal',
    body_html: `
      <p>This portal provides real-time access to Canadian energy data from multiple provincial sources.</p>
      <h3>What you can do here:</h3>
      <ul>
        <li><strong>Dashboard:</strong> View live charts and analytics</li>
        <li><strong>Provinces:</strong> Explore provincial energy profiles</li>
        <li><strong>Trends:</strong> Analyze historical patterns</li>
        <li><strong>Investment:</strong> Review economic opportunities</li>
      </ul>
      <p>Data streams continuously from IESO, AESO, and other providers with 99.9% uptime.</p>
    `,
    related_sources: [
      { name: 'IESO - Independent Electricity System Operator', url: 'https://www.ieso.ca/' },
      { name: 'AESO - Alberta Electric System Operator', url: 'https://www.aeso.ca/' }
    ],
    last_updated: new Date().toISOString()
  },
  'dashboard.overview': {
    short_text: 'Real-time energy dashboard with live streaming data',
    body_html: `
      <p>The dashboard displays live Ontario demand, provincial generation mix, Alberta market pricing, and weather correlations.</p>
      <h3>How to read the charts:</h3>
      <ul>
        <li><strong>Ontario Demand:</strong> MW values show electricity consumption every 5 minutes</li>
        <li><strong>Generation Mix:</strong> Pie chart shows renewable vs traditional sources</li>
        <li><strong>Alberta Prices:</strong> LMP (Locational Marginal Price) in CAD/MWh</li>
        <li><strong>Weather Correlation:</strong> Temperature vs demand patterns</li>
      </ul>
      <p>Click any chart header for detailed explanations and export options.</p>
    `,
    related_sources: [
      { name: 'Ontario Energy Data', url: 'https://www.ieso.ca/Power-Data' },
      { name: 'Alberta Energy Data', url: 'https://www.aeso.ca/market/market-updates' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.provinces': {
    short_text: 'Provincial energy data and live streaming connections',
    body_html: `
      <p>This page shows real-time energy data from Canadian provinces with live connection status.</p>
      <h3>Understanding the metrics:</h3>
      <ul>
        <li><strong>Generation Mix:</strong> Breakdown by source (hydro, nuclear, gas, wind, solar)</li>
        <li><strong>Connection Status:</strong> Green = live streaming, Blue = connecting</li>
        <li><strong>Data Sources:</strong> Each province has dedicated operators (IESO, AESO, etc.)</li>
      </ul>
      <p>The system maintains resilient connections with automatic failover to cached data.</p>
    `,
    related_sources: [
      { name: 'Canadian Energy Regulator', url: 'https://www.cer-rec.gc.ca/en/index.html' },
      { name: 'Statistics Canada Energy', url: 'https://www.statcan.gc.ca/en/subjects-start/energy' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.trends': {
    short_text: 'Advanced trend analysis and predictive modeling',
    body_html: `
      <p>Analyze long-term patterns in Canadian energy data with predictive analytics.</p>
      <h3>Key trend types:</h3>
      <ul>
        <li><strong>Peak Demand:</strong> Seasonal and daily consumption patterns</li>
        <li><strong>Generation Trends:</strong> Shift from fossil fuels to renewables</li>
        <li><strong>Price Volatility:</strong> Market price fluctuations and drivers</li>
        <li><strong>Weather Correlation:</strong> Temperature impact on energy use</li>
      </ul>
      <p>Try the interactive chart explanations for deeper insights into each trend.</p>
    `,
    related_sources: [
      { name: 'NRCan Energy Trends', url: 'https://www.nrcan.gc.ca/energy/energy-sources-distribution' },
      { name: 'Energy Information Administration', url: 'https://www.eia.gov/' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.investment': {
    short_text: 'Investment opportunities and financial analysis',
    body_html: `
      <p>Review energy investment opportunities with NPV/IRR calculations and risk assessments.</p>
      <h3>Understanding the metrics:</h3>
      <ul>
        <li><strong>NPV:</strong> Net Present Value - expected profit after discounting future cash flows</li>
        <li><strong>IRR:</strong> Internal Rate of Return - annualized rate of return on investment</li>
        <li><strong>Social Benefits:</strong> Community and environmental impact scores</li>
        <li><strong>Risk Assessment:</strong> Technical, market, and regulatory risk factors</li>
      </ul>
      <p>All calculations use real-time energy pricing and are illustrative for educational purposes.</p>
    `,
    related_sources: [
      { name: 'Canadian Infrastructure Bank', url: 'https://www.cib-bic.ca/' },
      { name: 'Sustainable Development Technology Canada', url: 'https://www.sdtc.ca/' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.resilience': {
    short_text: 'Climate resilience and infrastructure vulnerability assessment',
    body_html: `
      <p>Assess critical energy infrastructure resilience against climate scenarios and extreme weather.</p>
      <h3>Key resilience concepts:</h3>
      <ul>
        <li><strong>Risk Assessment:</strong> Exposure to climate hazards (flooding, heat, storms)</li>
        <li><strong>Asset Mapping:</strong> Critical infrastructure locations and interdependencies</li>
        <li><strong>Scenario Planning:</strong> Future climate impact modeling and adaptation strategies</li>
        <li><strong>Vulnerability Scores:</strong> 0-100 scale combining exposure and adaptive capacity</li>
      </ul>
      <p>Use the interactive map to explore local resilience challenges and community action items.</p>
    `,
    related_sources: [
      { name: 'Environment Canada Climate', url: 'https://www.canada.ca/en/environment-climate-change/services/climate-change.html' },
      { name: 'Natural Resources Canada Climate', url: 'https://www.nrcan.gc.ca/climate-change' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.innovation': {
    short_text: 'Technology innovation and research discovery',
    body_html: `
      <p>Discover emerging energy technologies and assess their commercial viability.</p>
      <h3>Understanding innovation metrics:</h3>
      <ul>
        <li><strong>TRL (Technology Readiness Level):</strong> 1-9 scale from concept to commercial deployment</li>
        <li><strong>TTR (Time to Readiness):</strong> Estimated years to reach TRL 9</li>
        <li><strong>Technology Search:</strong> Patent and research database queries</li>
        <li><strong>Feasibility Studies:</strong> Technical and economic viability assessments</li>
      </ul>
      <p>The innovation hub connects research with commercial opportunities and funding sources.</p>
    `,
    related_sources: [
      { name: 'Innovation Canada', url: 'https://www.ic.gc.ca/eic/site/093.nsf/eng/home' },
      { name: 'Mitacs Accelerate', url: 'https://www.mitacs.ca/en/programs/accelerate' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.indigenous': {
    short_text: 'Indigenous energy sovereignty and consultation framework',
    body_html: `
      <p>Respectful integration of Indigenous knowledge and governance in energy planning.</p>
      <h3>Key principles:</h3>
      <ul>
        <li><strong>Traditional Knowledge:</strong> Integration of Indigenous ecological and cultural knowledge</li>
        <li><strong>Territory Mapping:</strong> Traditional territory boundaries and consultation tracking</li>
        <li><strong>FPIC:</strong> Free, Prior, Informed Consent processes and documentation</li>
        <li><strong>Community Engagement:</strong> Meaningful participation in energy decision-making</li>
      </ul>
      <p><strong>Governance Note:</strong> This platform respects Indigenous data sovereignty and provides curated, community-approved information only.</p>
    `,
    related_sources: [
      { name: 'Indigenous Services Canada', url: 'https://www.sac-isc.gc.ca/eng/1100100010002/1524403202597' },
      { name: 'Crown-Indigenous Relations', url: 'https://www.rcaanc-cirnac.gc.ca/eng/1100100010001/1529360153669' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.stakeholders': {
    short_text: 'Multi-stakeholder coordination and engagement platform',
    body_html: `
      <p>Comprehensive stakeholder engagement and collaboration for energy projects.</p>
      <h3>Engagement framework:</h3>
      <ul>
        <li><strong>Stakeholder Mapping:</strong> Identify and categorize project stakeholders</li>
        <li><strong>Engagement Tracking:</strong> Log all communications and consultation activities</li>
        <li><strong>Impact Analysis:</strong> Geographic and social impact assessment</li>
        <li><strong>Consensus Building:</strong> Facilitated decision-making and dispute resolution</li>
      </ul>
      <p>The platform provides structured templates for outreach and maintains comprehensive engagement records.</p>
    `,
    related_sources: [
      { name: 'Canadian Environmental Assessment Agency', url: 'https://www.canada.ca/en/environmental-assessment-agency.html' },
      { name: 'Impact Assessment Agency', url: 'https://www.canada.ca/en/impact-assessment-agency.html' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.gridops': {
    short_text: 'Grid operations and system stability monitoring',
    body_html: `
      <p>Advanced grid management and real-time system stability monitoring.</p>
      <h3>Grid stability metrics:</h3>
      <ul>
        <li><strong>Frequency:</strong> System frequency (target: 60 Hz ± 0.5 Hz)</li>
        <li><strong>Inertia:</strong> System's ability to resist frequency changes</li>
        <li><strong>Reserves:</strong> Available capacity for balancing supply and demand</li>
        <li><strong>Load Balancing:</strong> Real-time optimization of generation and consumption</li>
      </ul>
      <p>Monitor system health and respond to events with predictive maintenance and automated balancing.</p>
    `,
    related_sources: [
      { name: 'IESO Grid Operations', url: 'https://www.ieso.ca/en/learn/grid-operations' },
      { name: 'NRCAN Grid Modernization', url: 'https://www.nrcan.gc.ca/energy/electricity-infrastructure/grid-modernization' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.security': {
    short_text: 'Cybersecurity and critical infrastructure protection',
    body_html: `
      <p>Enterprise-grade security monitoring and threat detection for energy infrastructure.</p>
      <h3>Security framework:</h3>
      <ul>
        <li><strong>Threat Detection:</strong> Advanced monitoring and anomaly detection</li>
        <li><strong>Access Control:</strong> Multi-factor authentication and role-based permissions</li>
        <li><strong>Incident Response:</strong> Automated response and recovery procedures</li>
        <li><strong>Compliance:</strong> Regulatory compliance and audit trail management</li>
      </ul>
      <p>The platform maintains comprehensive security logs and provides real-time threat intelligence.</p>
    `,
    related_sources: [
      { name: 'Canadian Centre for Cyber Security', url: 'https://www.cyber.gc.ca/' },
      { name: 'Public Safety Canada Critical Infrastructure', url: 'https://www.publicsafety.gc.ca/cnt/ntnl-scrt/crtcl-nfrstrctr/index-en.aspx' }
    ],
    last_updated: new Date().toISOString()
  },
  'page.education': {
    short_text: 'Educational resources and learning materials',
    body_html: `
      <p>Comprehensive learning resources for understanding energy systems and data analytics.</p>
      <h3>Educational content:</h3>
      <ul>
        <li><strong>Dataset Information:</strong> Detailed descriptions of data sources and limitations</li>
        <li><strong>Technical Architecture:</strong> How the streaming platform works</li>
        <li><strong>Best Practices:</strong> Data analysis and visualization guidelines</li>
        <li><strong>Case Studies:</strong> Real-world applications and examples</li>
      </ul>
      <p>Resources are designed for students, researchers, and energy professionals.</p>
    `,
    related_sources: [
      { name: 'Energy Information Administration Education', url: 'https://www.eia.gov/education/' },
      { name: 'Canadian Energy Literacy', url: 'https://www.energy-literacy.ca/' }
    ],
    last_updated: new Date().toISOString()
  }
};

interface HelpButtonProps {
  id: string;
  className?: string;
}

export function HelpButton({ id, className = '' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [shortText, setShortText] = useState<string>('Help');

  // Load tooltip text on component mount
  useEffect(() => {
    async function loadTooltip() {
      try {
        const manifest = await getCachedManifest();
        const item = manifest.find(item => item.id === id);
        if (item) {
          setShortText(item.short_text);
        } else {
          // Fall back to LOCAL_FALLBACK
          const fallback = LOCAL_FALLBACK[id];
          if (fallback) {
            setShortText(fallback.short_text);
          }
        }
      } catch (error) {
        console.warn('Failed to load help tooltip:', error);
        // Use LOCAL_FALLBACK for tooltip
        const fallback = LOCAL_FALLBACK[id];
        if (fallback) {
          setShortText(fallback.short_text);
        }
      }
    }

    loadTooltip();
  }, [id]);

  // Handle button click - fetch content if not already loaded
  const handleClick = async () => {
    setOpen(true);

    // Only fetch if we don't have content or it's for a different ID
    if (!content || content.id !== id) {
      setLoading(true);
      try {
        const fetchedContent = await fetchHelpById(id);
        setContent(fetchedContent);
      } catch (error) {
        console.error('Failed to load help content:', error);
        // Use LOCAL_FALLBACK when server fails
        const fallbackData = LOCAL_FALLBACK[id];
        if (fallbackData) {
          setContent({
            id,
            ...fallbackData
          });
        } else {
          // Set default error content
          setContent({
            id,
            short_text: 'Help',
            body_html: '<p>Unable to load help content. Please try again or contact support.</p>'
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Basic analytics tracking (can be enhanced later)
  const trackHelpOpen = (action: 'tooltip_hover' | 'button_click') => {
    // Simple console logging for now - can be enhanced with actual analytics
    console.debug(`Help ${action} for ${id}`, {
      timestamp: Date.now(),
      action: action,
      id: id
    });

    // TODO: Integrate with actual analytics service
    // Example: window.gtag('event', 'help_interaction', { action, id });
  };

  return (
    <>
      <button
        onClick={() => {
          trackHelpOpen('button_click');
          handleClick();
        }}
        onMouseEnter={() => trackHelpOpen('tooltip_hover')}
        aria-label={`Help: ${shortText}`}
        title={shortText}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-md
          bg-slate-700 hover:bg-slate-600
          border border-slate-600 hover:border-cyan-500
          transition-all duration-200
          text-cyan-400 hover:text-cyan-300
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${className}
        `}
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <HelpModal
          id={id}
          open={open}
          onClose={() => setOpen(false)}
          content={content}
          loading={loading}
        />
      )}
    </>
  );
}