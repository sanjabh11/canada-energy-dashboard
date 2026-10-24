/**
 * Certificate Module Content
 *
 * 15 educational modules across 3 certificate tracks:
 * - Residential Energy Management (5 modules)
 * - Grid Operations & Trading (5 modules)
 * - Policy & Regulatory Compliance (5 modules)
 *
 * Each module includes content_data specific to its type:
 * - video: { url, duration, transcript }
 * - reading: { content (markdown), estimatedReadTime }
 * - quiz: { questions[], passingScore }
 * - interactive: { tool, parameters }
 *
 * Implementation note: content is organized into per-track modules under
 * ./moduleContent/ and re-exported here to preserve the public API.
 */

export type {
  ContentType,
  VideoContent,
  ReadingContent,
  QuizQuestion,
  QuizContent,
  InteractiveContent,
  Module,
} from './moduleContent/types';

export { RESIDENTIAL_MODULES } from './moduleContent/residential';
export { GRID_OPS_MODULES } from './moduleContent/gridOps';
export { POLICY_MODULES } from './moduleContent/policy';
export {
  ALL_MODULES,
  getModulesByTrack,
  getModuleById,
  getNextModule,
  getPreviousModule,
} from './moduleContent/registry';
