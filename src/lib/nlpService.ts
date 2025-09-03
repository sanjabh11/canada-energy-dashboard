/**
 * Natural Language Processing Service
 *
 * Provides sentiment analysis, text categorization, and feedback processing
 * for stakeholder consultations and feedback analysis.
 */

// Interface definitions for NLP analysis
export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  confidence: number; // 0 to 1 (confidence level)
  label: 'negative' | 'neutral' | 'positive';
  magnitude: number; // Strength of sentiment
}

export interface FeedbackCategory {
  category: string;
  confidence: number;
  keywords: string[];
  subcategories?: string[];
}

export interface TextAnalysis {
  text: string;
  sentiment: SentimentAnalysis;
  categories: FeedbackCategory[];
  entities: {
    type: 'person' | 'organization' | 'location' | 'date' | 'event';
    text: string;
    confidence: number;
  }[];
  language: string;
  processedAt: string;
}

export interface FeedbackAnalysis {
  feedback: TextAnalysis;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
  concerns: string[];
  suggestions: string[];
  followUpRequired: boolean;
}

export interface NLPAnalysisConfig {
  enabled: boolean;
  apiEndpoint?: string;
  apiKey?: string;
  confidenceThreshold: number;
  maxEntities: number;
  fallbackMode: boolean;
}

// NLP Service Class
export class NLPService {
  private static instance: NLPService;
  private config: NLPAnalysisConfig;
  private cache = new Map<string, TextAnalysis>();

  private constructor() {
    this.config = {
      enabled: import.meta.env.VITE_NLP_ENABLED === 'true',
      apiEndpoint: import.meta.env.VITE_NLP_API_ENDPOINT,
      apiKey: import.meta.env.VITE_NLP_API_KEY,
      confidenceThreshold: 0.6,
      maxEntities: 5,
      fallbackMode: true
    };
  }

  public static getInstance(): NLPService {
    if (!NLPService.instance) {
      NLPService.instance = new NLPService();
    }
    return NLPService.instance;
  }

  /**
   * Analyze text for sentiment and categorization
   */
  async analyzeText(text: string, options?: {
    categories?: string[];
    language?: string;
    useCache?: boolean;
  }): Promise<TextAnalysis> {
    const cacheKey = `${text}_${options?.language || 'en'}`;

    if (options?.useCache !== false && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const analysis: TextAnalysis = {
      text,
      sentiment: this.analyzeSentiment(text),
      categories: this.categorizeText(text, options?.categories),
      entities: this.extractEntities(text),
      language: options?.language || 'en',
      processedAt: new Date().toISOString()
    };

    this.cache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * Comprehensive feedback analysis for consultation feedback
   */
  async analyzeFeedback(feedbackText: string, context?: {
    consultationType?: string;
    stakeholderType?: string;
  }): Promise<FeedbackAnalysis> {
    const textAnalysis = await this.analyzeText(feedbackText, {
      categories: [
        'environmental_impact',
        'community_concerns',
        'technical_issues',
        'economic_benefits',
        'cultural_impact',
        'scheduling_concerns',
        'communication_issues'
      ]
    });

    const feedbackAnalysis: FeedbackAnalysis = {
      feedback: textAnalysis,
      priority: this.determinePriority(textAnalysis),
      actionItems: this.extractActionItems(textAnalysis),
      concerns: this.extractConcerns(textAnalysis),
      suggestions: this.extractSuggestions(textAnalysis),
      followUpRequired: this.requiresFollowUp(textAnalysis)
    };

    return feedbackAnalysis;
  }

  /**
   * Batch analyze multiple feedback entries
   */
  async analyzeFeedbackBatch(feedbacks: string[], context?: {
    consultationType?: string;
  }): Promise<FeedbackAnalysis[]> {
    const promises = feedbacks.map(feedback =>
      this.analyzeFeedback(feedback, context)
    );

    return Promise.all(promises);
  }

  /**
   * Private method to analyze sentiment using rule-based approach
   */
  private analyzeSentiment(text: string): SentimentAnalysis {
    const lowerText = text.toLowerCase();

    // Positive words
    const positiveWords = [
      'excellent', 'great', 'amazing', 'fantastic', 'wonderful', 'good', 'positive',
      'support', 'helpful', 'beneficial', 'productive', 'constructive', 'promising',
      'successful', 'effective', 'efficient', 'improving', 'progress', 'encouraging',
      'appreciate', 'thank', 'thanks', 'appreciated', 'pleased', 'satisfied'
    ];

    // Negative words
    const negativeWords = [
      'bad', 'terrible', 'awful', 'poor', 'worried', 'concerned', 'disappointed',
      'problem', 'issue', 'risk', 'danger', 'harmful', 'adverse', 'negative',
      'detrimental', 'upsetting', 'frustrating', 'unacceptable', 'inadequate',
      'concerning', 'alarming', 'threatening', 'unacceptable'
    ];

    // Intensifiers
    const intensifiers = ['very', 'extremely', 'highly', 'completely', 'absolutely', 'totally'];

    let positiveScore = 0;
    let negativeScore = 0;
    let intensity = 1;

    const words = lowerText.split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (intensifiers.includes(word)) {
        intensity = 1.5;
        continue;
      }

      if (positiveWords.includes(word)) {
        positiveScore += intensity;
        intensity = 1;
      } else if (negativeWords.includes(word)) {
        negativeScore += intensity;
        intensity = 1;
      }
    }

    const totalScore = positiveScore - negativeScore;
    const totalWords = positiveScore + negativeScore;

    const score = totalWords > 0 ? totalScore / totalWords : 0;
    const magnitude = Math.min(Math.abs(score), 1);
    const confidence = Math.min(totalWords / 5, 1); // Higher confidence with more sentiment words

    let label: 'negative' | 'neutral' | 'positive' =
      score < -0.3 ? 'negative' :
      score > 0.3 ? 'positive' : 'neutral';

    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence,
      label,
      magnitude
    };
  }

  /**
   * Private method to categorize text
   */
  private categorizeText(text: string, categories?: string[]): FeedbackCategory[] {
    const lowerText = text.toLowerCase();
    const results: FeedbackCategory[] = [];

    // Pre-defined category patterns
    const categoryPatterns = {
      'environmental_impact': [
        'environment', 'environmental', 'ecosystem', 'habitat', 'wildlife', 'pollution',
        'climate', 'carbon', 'emissions', 'greenhouse', 'sustainability', 'impact'
      ],
      'community_concerns': [
        'community', 'local', 'residents', 'families', 'children', 'health',
        'noise', 'traffic', 'safety', 'school', 'housing', 'employment'
      ],
      'technical_issues': [
        'technical', 'engineering', 'design', 'construction', 'maintenance',
        'equipment', 'machinery', 'technology', 'power', 'energy', 'grid'
      ],
      'economic_benefits': [
        'economic', 'jobs', 'employment', 'revenue', 'taxes', 'investment',
        'growth', 'development', 'profit', 'financial', 'funding', 'income'
      ],
      'cultural_impact': [
        'cultural', 'traditional', 'heritage', 'ancestral', 'sacred', 'spiritual',
        'indigenous', 'first_nation', 'aboriginal', 'cultural', 'ceremony'
      ],
      'scheduling_concerns': [
        'schedule', 'timeline', 'deadline', 'delay', 'timeframe', 'duration',
        'planning', 'completion', 'construction', 'start', 'end'
      ],
      'communication_issues': [
        'communication', 'inform', 'consultation', 'meeting', 'discussion',
        'feedback', 'response', 'answer', 'question', 'documentation'
      ]
    };

    // Use provided categories or all available
    const categoriesToCheck = categories || Object.keys(categoryPatterns);

    for (const category of categoriesToCheck) {
      const patterns = categoryPatterns[category as keyof typeof categoryPatterns] || [];
      const matchingWords = patterns.filter(pattern => lowerText.includes(pattern));

      if (matchingWords.length > 0) {
        const confidence = Math.min(matchingWords.length / patterns.length, 1);
        results.push({
          category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          confidence,
          keywords: matchingWords,
          subcategories: []
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Private method to extract entities
   */
  private extractEntities(text: string): TextAnalysis['entities'] {
    const entities: TextAnalysis['entities'] = [];

    // Simple entity extraction (production would use NLP libraries)
    const patterns = [
      // Locations (places mentioned)
      { type: 'location' as const, patterns: [
        /(?:in|near|at|from)\s+([A-Z][a-z]+)/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s+(territory|province|region|rivers?|mountain))/gi
      ]},
      // Dates
      { type: 'date' as const, patterns: [
        /\b\d{4}-\d{2}-\d{2}\b/g,
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/gi
      ]},
      // Organizations
      { type: 'organization' as const, patterns: [
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(Ltd|Inc|Corp|Company|Association|Council))\b/g
      ]}
    ];

    for (const entityType of patterns) {
      for (const pattern of entityType.patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          entities.push({
            type: entityType.type,
            text: match[1] || match[0],
            confidence: 0.7 // Simple rule-based extraction
          });
        }
      }
    }

    return entities.slice(0, this.config.maxEntities);
  }

  /**
   * Determine priority level based on text analysis
   */
  private determinePriority(analysis: TextAnalysis): FeedbackAnalysis['priority'] {
    const { sentiment, categories } = analysis;

    // High priority indicators
    if (sentiment.score < -0.5 || sentiment.label === 'negative') {
      return 'high';
    }

    // Check for critical categories with negative sentiment
    const criticalCategories = ['environmental_impact', 'cultural_impact', 'community_concerns'];
    const hasCriticalConcern = categories.some(cat =>
      criticalCategories.includes(cat.category.toLowerCase().replace(' ', '_')) &&
      cat.confidence > 0.7
    );

    if (hasCriticalConcern) {
      return 'high';
    }

    // Medium priority for moderate concerns
    if (sentiment.score < -0.1 || categories.some(cat => cat.confidence > 0.8)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract action items from text analysis
   */
  private extractActionItems(analysis: TextAnalysis): string[] {
    const { text } = analysis;
    const actionItems: string[] = [];

    const actionPatterns = [
      /(?:need|require|should)\s+([^.!?]+(?:to|for)[^.!?]+)/gi,
      /(?:must|have to)\s+([^.!?]+(?:to|for)[^.!?]+)/gi,
      /(?:recommend|suggest)\s+([^.!?]+)/gi,
      /(?:please ensure|ensure that)\s+([^.!?]+)/gi
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        actionItems.push(match[1].trim());
      }
    }

    return actionItems.slice(0, 3); // Limit to top 3 actions
  }

  /**
   * Extract concerns from text analysis
   */
  private extractConcerns(analysis: TextAnalysis): string[] {
    const { text, sentiment } = analysis;

    if (sentiment.label !== 'negative') {
      return [];
    }

    const concernPatterns = [
      /(?:concerned|worried) (?:about|with|regarding)\s+([^.!?]+)/gi,
      /(?:problem|issue|risk) \w+ ([^.!?]+)/gi,
      /([^.!?]*?)(?:affect|impact|damage)[^.!?]+/gi
    ];

    const concerns: string[] = [];

    for (const pattern of concernPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        concerns.push(match[1].trim());
      }
    }

    return concerns.slice(0, 3);
  }

  /**
   * Extract suggestions from text analysis
   */
  private extractSuggestions(analysis: TextAnalysis): string[] {
    const { text } = analysis;

    const suggestionPatterns = [
      /(?:suggest|recommend)\s+([^.!?]+(?:to|that)[^.!?]+)/gi,
      /(?:better to|would prefer|would like to see)\s+([^.!?]+)/gi,
      /(?:instead should)\s+([^.!?]+)/gi
    ];

    const suggestions: string[] = [];

    for (const pattern of suggestionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        suggestions.push(match[1].trim());
      }
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Determine if feedback requires follow-up
   */
  private requiresFollowUp(analysis: TextAnalysis): boolean {
    const { sentiment, categories } = analysis;

    // Follow-up required for negative sentiment or critical concerns
    if (sentiment.score < -0.3) {
      return true;
    }

    const criticalCategories = ['environmental_impact', 'cultural_impact', 'community_concerns'];
    return categories.some(cat =>
      criticalCategories.includes(cat.category.toLowerCase().replace(' ', '_')) &&
      cat.confidence > 0.8
    );
  }

  /**
   * Generate sentiment summary for multiple feedback entries
   */
  generateSummary(analyses: FeedbackAnalysis[]): {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    averageSentiment: number;
    topCategories: { category: string; count: number }[];
    priorities: { priority: string; count: number }[];
    followUpRequired: number;
  } {
    const sentimentStats = {
      total: analyses.length,
      positive: analyses.filter(a => a.feedback.sentiment.label === 'positive').length,
      neutral: analyses.filter(a => a.feedback.sentiment.label === 'neutral').length,
      negative: analyses.filter(a => a.feedback.sentiment.label === 'negative').length
    };

    const averageSentiment = analyses.reduce((sum, a) => sum + a.feedback.sentiment.score, 0) / analyses.length;

    // Category frequency analysis
    const categoryCounts = new Map<string, number>();
    analyses.forEach(analysis => {
      analysis.feedback.categories.forEach(cat => {
        categoryCounts.set(cat.category, (categoryCounts.get(cat.category) || 0) + 1);
      });
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Priority distribution
    const priorityCounts = new Map<string, number>();
    analyses.forEach(analysis => {
      priorityCounts.set(analysis.priority, (priorityCounts.get(analysis.priority) || 0) + 1);
    });

    const priorities = Array.from(priorityCounts.entries())
      .map(([priority, count]) => ({ priority, count }))
      .sort((a, b) => b.count - a.count);

    const followUpRequired = analyses.filter(a => a.followUpRequired).length;

    return {
      ...sentimentStats,
      averageSentiment,
      topCategories,
      priorities,
      followUpRequired
    };
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NLPAnalysisConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const nlpService = NLPService.getInstance();

// Utility functions
export const SentimentUtils = {
  getSentimentColor: (sentiment: SentimentAnalysis['label']): string => {
    switch (sentiment) {
      case 'positive': return '#10b981'; // green
      case 'neutral': return '#6b7280'; // gray
      case 'negative': return '#ef4444'; // red
      default: return '#6b7280';
    }
  },

  getSentimentIcon: (sentiment: SentimentAnalysis['label']): string => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'neutral': return '😐';
      case 'negative': return '😞';
      default: return '🤔';
    }
  },

  formatSentiment: (sentiment: SentimentAnalysis): string => {
    const percentage = Math.abs(sentiment.score * 100).toFixed(0);
    return `${sentiment.label} (${percentage}%)`;
  }
};