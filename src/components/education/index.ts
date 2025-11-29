/**
 * Educational Components
 *
 * Educational UX components for making complex energy data accessible
 * to a range of users, from students to researchers.
 */

// Smart Help System
export { SmartHelpPanel } from './SmartHelpPanel';
export type { SmartHelpPanelProps, HelpContent, ExplanationLevel } from './SmartHelpPanel';

// Interactive Annotations
export { InteractiveAnnotation, AnnotationPresets } from './InteractiveAnnotation';
export type { InteractiveAnnotationProps, AnnotationType, AnnotationConfig } from './InteractiveAnnotation';

// Guided Tours
export { GuidedTour, TOUR_DEFINITIONS } from './GuidedTour';
export type { GuidedTourProps, TourStep, TourDefinition, TourRole } from './GuidedTour';

// Help Content Database
export {
  HELP_CONTENT_DATABASE,
  getHelpContent,
  getAllHelpContentIds,
  searchHelpContent
} from '../../lib/helpContentDatabase';
