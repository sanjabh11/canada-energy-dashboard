import type { Module } from './types';
import { RESIDENTIAL_MODULES } from './residential';
import { GRID_OPS_MODULES } from './gridOps';
import { POLICY_MODULES } from './policy';

/**
 * All modules combined for easy access
 */
export const ALL_MODULES: Module[] = [
  ...RESIDENTIAL_MODULES,
  ...GRID_OPS_MODULES,
  ...POLICY_MODULES,
];

/**
 * Get modules by track slug
 */
export function getModulesByTrack(trackSlug: string): Module[] {
  return ALL_MODULES.filter((m) => m.track_slug === trackSlug);
}

/**
 * Get single module by ID
 */
export function getModuleById(id: string): Module | undefined {
  return ALL_MODULES.find((m) => m.id === id);
}

/**
 * Get next module in sequence
 */
export function getNextModule(currentModuleId: string): Module | undefined {
  const currentModule = getModuleById(currentModuleId);
  if (!currentModule) return undefined;

  const trackModules = getModulesByTrack(currentModule.track_slug);
  const currentIndex = trackModules.findIndex((m) => m.id === currentModuleId);

  return currentIndex < trackModules.length - 1 ? trackModules[currentIndex + 1] : undefined;
}

/**
 * Get previous module in sequence
 */
export function getPreviousModule(currentModuleId: string): Module | undefined {
  const currentModule = getModuleById(currentModuleId);
  if (!currentModule) return undefined;

  const trackModules = getModulesByTrack(currentModule.track_slug);
  const currentIndex = trackModules.findIndex((m) => m.id === currentModuleId);

  return currentIndex > 0 ? trackModules[currentIndex - 1] : undefined;
}
