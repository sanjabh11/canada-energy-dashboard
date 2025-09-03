import { useState, useEffect } from 'react';
import { nlpService, NLPAnalysisConfig, FeedbackAnalysis, TextAnalysis } from '../lib/nlpService';

/**
 * React Hook for NLP sentiment analysis
 */
export function useFeedbackAnalysis(text: string, enabled: boolean = true) {
  const [analysis, setAnalysis] = useState<FeedbackAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !text.trim()) {
      setAnalysis(null);
      return;
    }

    const analyze = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await nlpService.analyzeFeedback(text);
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(analyze, 500); // Debounce analysis

    return () => clearTimeout(debounceTimer);
  }, [text, enabled]);

  return { analysis, loading, error };
}

/**
 * Hook for batch analysis of multiple feedback items
 */
export function useFeedbackBatchAnalysis(feedbacks: string[], enabled: boolean = true) {
  const [analyses, setAnalyses] = useState<FeedbackAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || feedbacks.length === 0) {
      setAnalyses([]);
      return;
    }

    const analyzeBatch = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await nlpService.analyzeFeedbackBatch(feedbacks);
        setAnalyses(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Batch analysis failed');
        setAnalyses([]);
      } finally {
        setLoading(false);
      }
    };

    analyzeBatch();
  }, [JSON.stringify(feedbacks), enabled]);

  const summary = analyses.length > 0 ? nlpService.generateSummary(analyses) : null;

  return { analyses, summary, loading, error };
}

/**
 * Hook for real-time text analysis
 */
export function useTextAnalysis(text: string, enabled: boolean = true) {
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !text.trim()) {
      setAnalysis(null);
      return;
    }

    const analyze = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await nlpService.analyzeText(text, {
          useCache: true,
          language: 'en'
        });
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Text analysis failed');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(analyze, 300); // Faster debounce for real-time

    return () => clearTimeout(debounceTimer);
  }, [text, enabled]);

  return { analysis, loading, error };
}

/**
 * Hook for consultation message sentiment analysis
 */
export function useMessageSentiment(messages: Array<{
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  timestamp: string;
}>, enabled: boolean = true) {
  const [messageAnalysis, setMessageAnalysis] = useState<Map<string, TextAnalysis>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || messages.length === 0) {
      setMessageAnalysis(new Map());
      return;
    }

    const analyzeMessages = async () => {
      setLoading(true);
      setError(null);

      try {
        const analyses = new Map<string, TextAnalysis>();

        // Analyze messages in batches to avoid overwhelming the service
        const batchSize = 5;
        for (let i = 0; i < messages.length; i += batchSize) {
          const batch = messages.slice(i, i + batchSize);

          const promises = batch.map(async (message) => {
            if (message.content.trim()) {
              const analysis = await nlpService.analyzeText(message.content, {
                useCache: true
              });
              return { id: message.id, analysis };
            }
            return null;
          });

          const results = await Promise.all(promises);

          results.forEach(result => {
            if (result) {
              analyses.set(result.id, result.analysis);
            }
          });
        }

        setMessageAnalysis(analyses);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Message analysis failed');
        setMessageAnalysis(new Map());
      } finally {
        setLoading(false);
      }
    };

    analyzeMessages();
  }, [JSON.stringify(messages.map(m => ({ id: m.id, content: m.content }))), enabled]);

  const getMessageSentiment = (messageId: string): TextAnalysis['sentiment'] | undefined => {
    return messageAnalysis.get(messageId)?.sentiment;
  };

  const getMessageCategories = (messageId: string): TextAnalysis['categories'] => {
    return messageAnalysis.get(messageId)?.categories || [];
  };

  const getOverallSentiment = () => {
    if (messageAnalysis.size === 0) return null;

    const sentiments = Array.from(messageAnalysis.values()).map(a => a.sentiment);

    const averageScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    const averageConfidence = sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length;

    return {
      score: averageScore,
      confidence: averageConfidence,
      label: averageScore > 0.3 ? 'positive' : averageScore < -0.3 ? 'negative' : 'neutral',
      magnitude: Math.min(Math.abs(averageScore), 1)
    };
  };

  return {
    messageAnalysis,
    getMessageSentiment,
    getMessageCategories,
    getOverallSentiment,
    loading,
    error
  };
}

/**
 * Hook for NLP service health monitoring
 */
export function useNLPHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = Date.now();

      try {
        // Simple health check using a basic analysis
        await nlpService.analyzeText('Test message for health check');
        setLatency(Date.now() - startTime);
        setIsHealthy(true);
      } catch (error) {
        setIsHealthy(false);
        setLatency(null);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { isHealthy, latency };
}