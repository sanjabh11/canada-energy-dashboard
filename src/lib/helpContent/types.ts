/**
 * Shared types for the help content database.
 */
export interface HelpContentItem {
  id: string;
  title: string;
  shortText: string;
  bodyHtml: string;
  relatedTopics?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}
