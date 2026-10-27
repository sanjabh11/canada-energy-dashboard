/**
 * Aggregated help content database.
 *
 * Spread order preserves the exact key order of the original
 * HELP_CONTENT_DATABASE literal in helpContent.ts.
 */
import type { HelpContentItem } from './types';
import { OVERVIEW_CONTENT } from './overview';
import { AI_DATACENTRE_CONTENT } from './aiDatacentre';
import { HYDROGEN_CONTENT } from './hydrogen';
import { EV_INFRASTRUCTURE_CONTENT } from './evInfrastructure';
import { CARBON_CONTENT } from './carbon';
import { MINERALS_CONTENT } from './minerals';
import { CCUS_CONTENT } from './ccus';
import { HEATPUMP_CONTENT } from './heatpump';
import { SMR_CONTENT } from './smr';
import { GRID_CONTENT } from './grid';
import { CLIMATE_CONTENT } from './climate';
import { QUEUE_CONTENT } from './queue';
import { CAPACITY_CONTENT } from './capacity';
import { VPP_CONTENT } from './vpp';
import { STORAGE_CONTENT } from './storage';
import { CURTAILMENT_CONTENT } from './curtailment';
import { DIGITAL_TWIN_CONTENT } from './digitalTwin';
import { SECURITY_CONTENT } from './security';
import { INDIGENOUS_CONTENT } from './indigenous';
import { CER_CONTENT } from './cer';
import { CONDENSED_CONTENT } from './condensed';
import { PAGES_CONTENT } from './pages';
import { SCENARIOS_CONTENT } from './scenarios';

export const HELP_CONTENT_DATABASE: Record<string, HelpContentItem> = {
  ...OVERVIEW_CONTENT,
  ...AI_DATACENTRE_CONTENT,
  ...HYDROGEN_CONTENT,
  ...EV_INFRASTRUCTURE_CONTENT,
  ...CARBON_CONTENT,
  ...MINERALS_CONTENT,
  ...CCUS_CONTENT,
  ...HEATPUMP_CONTENT,
  ...SMR_CONTENT,
  ...GRID_CONTENT,
  ...CLIMATE_CONTENT,
  ...QUEUE_CONTENT,
  ...CAPACITY_CONTENT,
  ...VPP_CONTENT,
  ...STORAGE_CONTENT,
  ...CURTAILMENT_CONTENT,
  ...DIGITAL_TWIN_CONTENT,
  ...SECURITY_CONTENT,
  ...INDIGENOUS_CONTENT,
  ...CER_CONTENT,
  ...CONDENSED_CONTENT,
  ...PAGES_CONTENT,
  ...SCENARIOS_CONTENT,
};
