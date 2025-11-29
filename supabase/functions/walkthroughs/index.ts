// Supabase Edge Function: walkthroughs
// Provides interactive guided walkthroughs for educational purposes
// Endpoints:
//  - GET /walkthroughs/{pageId}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

const jsonHeaders = { 'Content-Type': 'application/json' };

// Predefined walkthroughs for different pages
const WALKTHROUGHS = {
  'dashboard': {
    title: 'Dashboard Exploration',
    description: 'Learn to navigate and understand the real-time energy dashboard',
    steps: [
      {
        id: 'step1',
        title: 'Welcome to the Dashboard',
        content: 'This dashboard shows live Ontario electricity demand, provincial generation mix, Alberta market prices, and weather correlations. All data is updated in real-time.',
        target: '.dashboard-header',
        position: 'bottom',
        action: 'next'
      },
      {
        id: 'step2',
        title: 'Understanding Demand Charts',
        content: 'The demand chart shows electricity consumption over time. Peaks typically occur during evening hours when people return home and use appliances.',
        target: '.demand-chart',
        position: 'right',
        action: 'next'
      },
      {
        id: 'step3',
        title: 'Generation Mix Breakdown',
        content: 'This chart shows the sources of electricity generation. Notice how renewable sources like hydro and wind contribute to the energy mix.',
        target: '.generation-chart',
        position: 'left',
        action: 'next'
      },
      {
        id: 'step4',
        title: 'Market Price Analysis',
        content: 'Electricity prices fluctuate based on supply and demand. Higher prices often correlate with peak demand periods.',
        target: '.price-chart',
        position: 'top',
        action: 'next'
      },
      {
        id: 'step5',
        title: 'Interactive Exploration',
        content: 'Try clicking on different data points or using the filters to explore the data. The "?" buttons provide detailed explanations for each chart.',
        target: '.filters-section',
        position: 'bottom',
        action: 'complete'
      }
    ]
  },

  'provinces': {
    title: 'Provincial Energy Systems',
    description: 'Explore how different provinces manage their energy systems',
    steps: [
      {
        id: 'step1',
        title: 'Provincial Overview',
        content: 'Each province has unique energy challenges and resources. Ontario relies heavily on nuclear and hydro power.',
        target: '.province-selector',
        position: 'bottom',
        action: 'next'
      },
      {
        id: 'step2',
        title: 'Interprovincial Trade',
        content: 'Provinces trade electricity to balance supply and demand. Ontario often exports power to neighboring provinces.',
        target: '.trade-chart',
        position: 'right',
        action: 'next'
      },
      {
        id: 'step3',
        title: 'Renewable Integration',
        content: 'Different provinces have varying levels of renewable energy adoption. British Columbia leads in hydro power.',
        target: '.renewable-chart',
        position: 'left',
        action: 'complete'
      }
    ]
  },

  'trends': {
    title: 'Trend Analysis Guide',
    description: 'Learn to identify patterns and forecast energy trends',
    steps: [
      {
        id: 'step1',
        title: 'Seasonal Patterns',
        content: 'Energy demand follows seasonal patterns. Summer peaks are driven by air conditioning, while winter peaks come from heating.',
        target: '.seasonal-chart',
        position: 'bottom',
        action: 'next'
      },
      {
        id: 'step2',
        title: 'Peak Detection',
        content: 'The system automatically detects peak demand periods. These are critical for grid planning and reliability.',
        target: '.peaks-indicator',
        position: 'right',
        action: 'next'
      },
      {
        id: 'step3',
        title: 'Forecasting Methods',
        content: 'We use statistical methods like moving averages and trend analysis to forecast future energy needs.',
        target: '.forecast-chart',
        position: 'left',
        action: 'complete'
      }
    ]
  },

  'education': {
    title: 'Educational Resources',
    description: 'Access learning materials and classroom activities',
    steps: [
      {
        id: 'step1',
        title: 'Dataset Information',
        content: 'Each dataset comes from official sources like IESO and Natural Resources Canada. Click any dataset for detailed information.',
        target: '.dataset-cards',
        position: 'bottom',
        action: 'next'
      },
      {
        id: 'step2',
        title: 'Interactive Learning',
        content: 'Use the "?" buttons throughout the application to access detailed explanations and classroom activities.',
        target: '.help-button',
        position: 'right',
        action: 'next'
      },
      {
        id: 'step3',
        title: 'Data Export',
        content: 'Download data for your own analysis or classroom projects. Remember to cite the original sources.',
        target: '.export-button',
        position: 'left',
        action: 'complete'
      }
    ]
  }
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Extract pageId from path: /walkthroughs/{pageId}
    if (pathParts.length < 2 || pathParts[0] !== 'walkthroughs') {
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: jsonHeaders
      });
    }

    const pageId = pathParts[1];

    if (req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: jsonHeaders
      });
    }

    const walkthrough = WALKTHROUGHS[pageId as keyof typeof WALKTHROUGHS];

    if (!walkthrough) {
      return new Response(JSON.stringify({
        error: 'Walkthrough not found',
        available: Object.keys(WALKTHROUGHS)
      }), {
        status: 404,
        headers: jsonHeaders
      });
    }

    return new Response(JSON.stringify(walkthrough), {
      status: 200,
      headers: jsonHeaders
    });

  } catch (e) {
    console.error('Walkthroughs endpoint error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: jsonHeaders
    });
  }
});