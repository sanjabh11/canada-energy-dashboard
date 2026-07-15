import { Command } from 'cmdk';
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  TrendingUp,
  Calculator,
  FileText,
  Shield,
  Zap,
  Leaf,
  Users,
  Building2,
  GraduationCap,
  DollarSign,
  Activity,
  Globe,
  Cpu,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

interface PaletteItem {
  label: string;
  path: string;
  icon: LucideIcon;
  keywords?: string;
}

interface PaletteGroup {
  heading: string;
  items: PaletteItem[];
}

const GROUPS: PaletteGroup[] = [
  {
    heading: 'Core Dashboards',
    items: [
      { label: 'Energy Dashboard', path: '/dashboard', icon: LayoutDashboard, keywords: 'main home overview grid' },
      { label: 'Energy Facility Map', path: '/energy-map', icon: Globe, keywords: 'map gis geographic facilities maplibre' },
      { label: 'Analytics & Trends', path: '/analytics', icon: TrendingUp, keywords: 'charts trends analysis metrics' },
      { label: 'Data Freshness', path: '/data-freshness', icon: Activity, keywords: 'stale freshness update source' },
      { label: 'Status Page', path: '/status', icon: Activity, keywords: 'ops health system status' },
    ],
  },
  {
    heading: 'Forecasting & ML',
    items: [
      { label: 'Demand Forecast', path: '/demand-forecast', icon: TrendingUp, keywords: 'load forecast ontario prediction' },
      { label: 'Utility Demand Forecast', path: '/utility-demand-forecast', icon: TrendingUp, keywords: 'utility planning load forecast' },
      { label: 'Forecast Benchmarking', path: '/forecast-benchmarking', icon: TrendingUp, keywords: 'benchmark evaluation mae mape tsfm' },
      { label: 'TSFM Benchmarks', path: '/tsfm-benchmarks', icon: Cpu, keywords: 'foundation model zero-shot benchmark' },
      { label: 'Scenario Workbench', path: '/scenario-workbench', icon: Cpu, keywords: 'scenario analysis what-if' },
    ],
  },
  {
    heading: 'TIER Carbon Compliance',
    items: [
      { label: 'TIER Compliance Landing', path: '/tier-compliance', icon: Leaf, keywords: 'tier compliance alberta carbon' },
      { label: 'TIER ROI Calculator', path: '/roi-calculator', icon: Calculator, keywords: 'tier roi calculator savings' },
      { label: 'TIER Credit Calculator', path: '/tier-calculator', icon: Calculator, keywords: 'tier credit calculator epc offset' },
      { label: 'Credit Banking', path: '/credit-banking', icon: DollarSign, keywords: 'tier credit banking audit ledger' },
      { label: 'Direct Investment Audit', path: '/direct-investment', icon: FileText, keywords: 'dip direct investment audit trail' },
      { label: 'Industrial TIER Pack', path: '/industrial', icon: Building2, keywords: 'industrial tier compliance emitter' },
    ],
  },
  {
    heading: 'Regulatory & Proof Packs',
    items: [
      { label: 'Regulatory Filing Export', path: '/regulatory-filing', icon: FileText, keywords: 'oeb auc rule 005 filing' },
      { label: 'BYO-CSV Proof Generator', path: '/byo-csv-proof', icon: Shield, keywords: 'csv proof privacy local browser' },
      { label: 'Asset Health / CBRM', path: '/asset-health', icon: Activity, keywords: 'asset health cbrm scoring capex' },
      { label: 'Utility Security Statement', path: '/utility-security', icon: Shield, keywords: 'security procurement sbom' },
      { label: 'Bank-Ready Export', path: '/bank-export', icon: FileText, keywords: 'bank green loan export report' },
    ],
  },
  {
    heading: 'Ontario & Peak Management',
    items: [
      { label: 'GA/ICI 5CP Predictor', path: '/ga-ici-5cp', icon: TrendingUp, keywords: 'ontario ga ici 5cp peak demand' },
      { label: 'Shadow Billing', path: '/shadow-billing', icon: DollarSign, keywords: 'shadow billing invoice comparison' },
      { label: 'Bill Comparison', path: '/bill-comparison', icon: DollarSign, keywords: 'bill comparison rate alberta' },
    ],
  },
  {
    heading: 'Sector Dashboards',
    items: [
      { label: 'Hydrogen Economy', path: '/hydrogen', icon: Zap, keywords: 'hydrogen economy hub production' },
      { label: 'Critical Minerals', path: '/critical-minerals', icon: Globe, keywords: 'minerals supply chain critical' },
      { label: 'AI Data Centres', path: '/ai-data-centre', icon: Cpu, keywords: 'ai data centre datacenter load' },
      { label: 'Landfill Methane', path: '/landfill-methane', icon: Leaf, keywords: 'methane landfill gas capture' },
      { label: 'CO2 Emissions Tracker', path: '/co2', icon: Leaf, keywords: 'co2 carbon emissions tracker' },
      { label: 'ESG Finance', path: '/esg-finance', icon: DollarSign, keywords: 'esg finance green bond sustainable' },
      { label: 'Arctic Energy Security', path: '/arctic-energy', icon: Globe, keywords: 'arctic energy security north' },
      { label: 'Digital Twin', path: '/digital-twin', icon: Cpu, keywords: 'digital twin simulation model' },
    ],
  },
  {
    heading: 'Indigenous & Municipal',
    items: [
      { label: 'Indigenous Energy', path: '/indigenous', icon: Users, keywords: 'indigenous energy ocap sovereignty' },
      { label: 'Funder Reporting', path: '/funder-reporting', icon: FileText, keywords: 'indigenous funder report aicei' },
      { label: 'AICEI Reporting', path: '/aicei', icon: FileText, keywords: 'aicei indigenous climate energy' },
      { label: 'Sovereign Data Vault', path: '/ocap-data', icon: Shield, keywords: 'ocap data sovereignty vault' },
      { label: 'Municipal Climate Tools', path: '/for-municipalities', icon: Building2, keywords: 'municipal climate fcm aicei' },
    ],
  },
  {
    heading: 'AI & Automation',
    items: [
      { label: 'AI Energy Oracle', path: '/oracle', icon: Cpu, keywords: 'ai oracle energy analysis llm' },
      { label: 'Energy Copilot', path: '/copilot', icon: Cpu, keywords: 'copilot assistant ai chat' },
      { label: 'Ask Data (NL2SQL)', path: '/ask-data', icon: Search, keywords: 'nl2sql natural language query' },
      { label: 'Agent Runner', path: '/workflows', icon: Cpu, keywords: 'agent workflow automation' },
    ],
  },
  {
    heading: 'Rate Watchdog & Retail',
    items: [
      { label: 'Rate Watchdog', path: '/watchdog', icon: DollarSign, keywords: 'rate watchdog alberta retailer' },
      { label: 'RRO Alerts', path: '/rro', icon: DollarSign, keywords: 'rro rate alert regulated' },
      { label: 'Retailer Hedging', path: '/hedging', icon: TrendingUp, keywords: 'retailer hedging tools' },
    ],
  },
  {
    heading: 'Training & Education',
    items: [
      { label: 'Training Coordinators', path: '/training-coordinators', icon: GraduationCap, keywords: 'training coordinator cohort' },
      { label: 'Certificates', path: '/certificates', icon: GraduationCap, keywords: 'certificate track module' },
      { label: 'Badges', path: '/badges', icon: GraduationCap, keywords: 'badge achievement gamification' },
    ],
  },
  {
    heading: 'Business & Sales',
    items: [
      { label: 'Pricing', path: '/pricing', icon: DollarSign, keywords: 'pricing plans subscription' },
      { label: 'Enterprise', path: '/enterprise', icon: Building2, keywords: 'enterprise sales contact' },
      { label: 'Compare vs Competitors', path: '/compare', icon: Search, keywords: 'competitor comparison vs' },
      { label: 'Pilot Readiness', path: '/pilot-readiness', icon: FileText, keywords: 'pilot evidence readiness' },
      { label: 'Solutions Navigator', path: '/solutions', icon: Search, keywords: 'solutions use cases' },
    ],
  },
  {
    heading: 'Account & Settings',
    items: [
      { label: 'Profile', path: '/profile', icon: Settings, keywords: 'profile account user' },
      { label: 'Settings', path: '/settings', icon: Settings, keywords: 'settings preferences config' },
      { label: 'API Keys', path: '/api-keys', icon: Shield, keywords: 'api key token access' },
      { label: 'API Docs', path: '/api-docs', icon: FileText, keywords: 'api documentation openapi swagger' },
      { label: 'About', path: '/about', icon: HelpCircle, keywords: 'about ceip platform' },
      { label: 'Contact', path: '/contact', icon: HelpCircle, keywords: 'contact support help' },
    ],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      overlayClassName="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[20%] z-[201] w-[90vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <Command.Input
          placeholder="Search routes, features, or actions..."
          className="w-full bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </div>
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-gray-400">
          No results found.
        </Command.Empty>
        {GROUPS.map((group) => (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-gray-400"
          >
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.path}
                  value={`${item.label} ${item.keywords ?? ''}`}
                  onSelect={() => handleSelect(item.path)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-900 dark:text-gray-200 dark:data-[selected=true]:bg-blue-900/30 dark:data-[selected=true]:text-blue-100"
                >
                  <Icon className="h-4 w-4 shrink-0 text-gray-400 data-[selected=true]:text-blue-500" />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="hidden shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400 sm:inline-block dark:border-gray-600 dark:bg-gray-800">
                    {item.path}
                  </kbd>
                </Command.Item>
              );
            })}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
