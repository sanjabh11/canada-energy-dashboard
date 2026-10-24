/**
 * Comprehensive Help Content Database
 *
 * Student-friendly explanations for all platform features.
 * Designed to be educational, clear, and accessible.
 *
 * Implementation note: content is organized into per-domain modules under
 * ./helpContent/ and re-exported here to preserve the public API.
 */

export type { HelpContentItem } from './helpContent/types';
export { HELP_CONTENT_DATABASE } from './helpContent/database';
export { getHelpContent, getShortHelp, searchHelpContent } from './helpContent/functions';
