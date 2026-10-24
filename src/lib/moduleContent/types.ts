/**
 * Shared types for certificate module content.
 */
export type ContentType = 'video' | 'reading' | 'quiz' | 'interactive';

export interface VideoContent {
  url: string;
  duration: number; // seconds
  transcript?: string;
  thumbnailUrl?: string;
}

export interface ReadingContent {
  content: string; // Markdown
  estimatedReadTime: number; // minutes
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation: string;
}

export interface QuizContent {
  questions: QuizQuestion[];
  passingScore: number; // Percentage (e.g., 80 = 80%)
}

export interface InteractiveContent {
  tool: 'calculator' | 'simulator' | 'comparison';
  title: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface Module {
  id: string;
  track_id: string;
  track_slug: string;
  title: string;
  description: string;
  sequence_number: number;
  duration_minutes: number;
  content_type: ContentType;
  content_data: VideoContent | ReadingContent | QuizContent | InteractiveContent;
  learning_objectives: string[];
  prerequisites?: string[];
}
