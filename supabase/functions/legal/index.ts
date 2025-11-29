// Supabase Edge Function: legal
// Provides privacy policy and legal information
// Endpoints:
//  - GET /legal/privacy

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const jsonHeaders = { 'Content-Type': 'application/json' };

// Privacy Policy Content
const PRIVACY_POLICY = {
  title: "Privacy Policy",
  version: "1.0.0",
  lastUpdated: "2025-09-03",
  effectiveDate: "2025-09-03",

  summary: "This privacy policy explains how the Canadian Energy Information Portal collects, uses, and protects your personal information.",

  sections: [
    {
      title: "Information We Collect",
      content: `We collect the following types of information:

• **Usage Data**: How you interact with our platform, including pages visited, features used, and time spent
• **Device Information**: Browser type, operating system, and device identifiers
• **IP Address**: For security and analytics purposes
• **LLM Interactions**: Questions asked to our AI assistant and responses provided (stored for 180 days)
• **Feedback**: User ratings and comments on AI responses`
    },

    {
      title: "How We Use Your Information",
      content: `Your information is used to:

• Provide and improve our educational platform
• Generate AI-powered explanations and insights
• Monitor system performance and security
• Comply with legal and regulatory requirements
• Conduct research and analytics for educational purposes`
    },

    {
      title: "Data Sharing and Disclosure",
      content: `We do not sell your personal information. We may share data:

• With service providers who help operate our platform
• When required by law or to protect our rights
• In aggregated, anonymized form for research purposes
• With educational institutions for approved research projects`
    },

    {
      title: "Data Security",
      content: `We implement industry-standard security measures:

• End-to-end encryption for data transmission
• Secure storage with access controls
• Regular security audits and updates
• PII redaction for AI processing
• Rate limiting and abuse prevention`
    },

    {
      title: "Data Retention",
      content: `We retain data for the following periods:

• Usage logs: 90 days
• LLM interactions: 180 days
• Feedback data: 365 days
• Account data: Until account deletion`
    },

    {
      title: "Your Rights",
      content: `You have the right to:

• Access your personal information
• Correct inaccurate data
• Request data deletion
• Opt out of non-essential data collection
• File complaints with privacy authorities`
    },

    {
      title: "Cookies and Tracking",
      content: `We use cookies for:

• Session management
• Analytics and performance monitoring
• Security and fraud prevention

You can control cookie settings in your browser.`
    },

    {
      title: "International Data Transfers",
      content: `Data may be processed in Canada and other countries. We ensure appropriate safeguards for international transfers in compliance with Canadian privacy laws.`
    },

    {
      title: "Children's Privacy",
      content: `Our platform is designed for educational use. We do not knowingly collect personal information from children under 13 without parental consent.`
    },

    {
      title: "Changes to This Policy",
      content: `We may update this privacy policy periodically. Significant changes will be communicated through our platform or email notifications.`
    },

    {
      title: "Contact Information",
      content: `For privacy-related questions or concerns:

Email: privacy@energyportal.ca
Phone: 1-800-ENERGY-1
Address: Canadian Energy Information Portal, Privacy Office, Ottawa, ON, Canada`
    }
  ],

  contact: {
    email: "privacy@energyportal.ca",
    phone: "1-800-ENERGY-1",
    address: "Canadian Energy Information Portal, Privacy Office, Ottawa, ON, Canada"
  },

  compliance: {
    framework: "PIPEDA (Personal Information Protection and Electronic Documents Act)",
    certification: "None required for educational platform",
    lastAudit: "2025-08-01"
  }
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: jsonHeaders
      });
    }

    // Extract endpoint from path: /legal/{endpoint}
    if (pathParts.length < 2 || pathParts[0] !== 'legal') {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const endpoint = pathParts[1];

    if (endpoint === 'privacy') {
      return new Response(JSON.stringify(PRIVACY_POLICY), {
        status: 200,
        headers: jsonHeaders
      });
    }

    return new Response(JSON.stringify({
      error: 'Endpoint not found',
      available: ['privacy']
    }), {
      status: 404,
      headers: jsonHeaders
    });

  } catch (e) {
    console.error('Legal endpoint error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
});