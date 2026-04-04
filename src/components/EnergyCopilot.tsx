/**
 * EnergyCopilot - Multi-Source AI Assistant
 * 
 * Chat interface that uses Tool Calling to combine data from multiple sources
 * (AESO, IESO, emissions, forecasts, corpus) into comprehensive answers.
 * 
 * Route: /copilot
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fetchEdgePostJson } from '@/lib/edge';
import { SEOHead } from './SEOHead';
import { cn } from '@/lib/utils';
import { FoundationRepairGate } from './FoundationRepairGate';
import { canAccessPhase4Experience } from '../lib/foundation';
import {
  Send,
  Loader2,
  Bot,
  User,
  Database,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Zap,
  Leaf,
  BarChart3,
  Copy,
  X
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    result?: unknown;
  }>;
  sources?: Array<{
    name: string;
    freshness?: string;
  }>;
}

interface CopilotResponse {
  answer: string;
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
  iterations: number;
  success: boolean;
  error?: string;
}

const EXAMPLE_QUERIES = [
  'Compare Ontario and Alberta pool prices right now',
  'What is the current grid status in Alberta and what are the emissions?',
  'Find arbitrage opportunities between provinces today',
  'Show me battery storage activity in Ontario',
  'Search the corpus for TIER regulations and show me current Alberta prices',
  'Generate a summary of renewable penetration across all provinces',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function formatTimestamp(date: string): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function EnergyCopilot() {
  const phase4Enabled = canAccessPhase4Experience(import.meta.env);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Energy Copilot. I can combine data from multiple sources (AESO, IESO, emissions forecasts, and our knowledge corpus) to answer complex questions. Try asking me to compare provinces, find opportunities, or explain trends!',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowExamples(false);

    // Add placeholder for assistant response
    const assistantId = generateId();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCalls: [],
    }]);

    try {
      const { json } = await fetchEdgePostJson(
        ['llm/copilot'],
        { query: userMessage.content },
        { signal: abortControllerRef.current.signal }
      );

      if (json?.error) {
        throw new Error(json.error);
      }

      const result: CopilotResponse = json;

      // Update assistant message with result
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId
          ? {
              ...msg,
              content: result.answer,
              toolCalls: result.toolCalls.map(tc => ({
                name: tc.name,
                status: 'success' as const,
              })),
              sources: result.toolCalls.map(tc => ({
                name: tc.name,
              })),
            }
          : msg
      ));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId
          ? {
              ...msg,
              content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
              toolCalls: [{ name: 'error', status: 'error', result: errorMessage }],
            }
          : msg
      ));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadExample = (example: string) => {
    setInput(example);
    setShowExamples(false);
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Energy Copilot. I can combine data from multiple sources (AESO, IESO, emissions forecasts, and our knowledge corpus) to answer complex questions. Try asking me to compare provinces, find opportunities, or explain trends!',
      timestamp: new Date().toISOString(),
    }]);
    setShowExamples(true);
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Energy Copilot | AI-Powered Energy Intelligence"
        description="Ask complex energy questions across multiple data sources. Compare provinces, find arbitrage opportunities, analyze trends with AI."
        path="/copilot"
        keywords={['energy copilot', 'AI assistant', 'energy analytics', 'multi-source data', 'Alberta', 'Ontario', 'emissions', 'forecasts']}
      />

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Energy Copilot</h1>
                <p className="text-sm text-muted-foreground">
                  Multi-source AI intelligence (AESO · IESO · Emissions · Forecasts)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Clear conversation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <FoundationRepairGate
            surfaceName="Energy Copilot"
            summary="Tool-calling answers are gated while fallback data, freshness metadata, and cross-source verification are still being repaired."
            dataTestId="foundation-repair-gate"
          >
          {showExamples && messages.length <= 1 && (
            <div className="mb-6 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Try asking:
              </p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example) => (
                  <button
                    key={example}
                    onClick={() => loadExample(example)}
                    className="text-sm px-3 py-1.5 rounded-full bg-card border hover:bg-secondary transition-colors text-left"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'flex-row-reverse' : ''
                )}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground'
                    : message.role === 'tool'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                )}>
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : message.role === 'tool' ? (
                    <Database className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>

                <div className={cn(
                  'flex-1 max-w-[80%]',
                  message.role === 'user' ? 'text-right' : ''
                )}>
                  <div className={cn(
                    'inline-block rounded-lg p-3 text-left',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border'
                  )}>
                    {message.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {message.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-1 last:mb-0">{line}</p>
                        ))}
                      </div>
                    ) : isLoading && message.role === 'assistant' ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    ) : null}

                    {/* Tool execution indicators */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                        {message.toolCalls.map((tc, i) => (
                          <span
                            key={i}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                              tc.status === 'pending' && 'bg-blue-100 text-blue-700',
                              tc.status === 'success' && 'bg-green-100 text-green-700',
                              tc.status === 'error' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {tc.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {tc.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                            {tc.status === 'error' && <AlertTriangle className="h-3 w-3" />}
                            {tc.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        Sources: {message.sources.map(s => s.name).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground px-1">
                    {formatTimestamp(message.timestamp)}
                    {message.role === 'assistant' && message.content && (
                      <button
                        onClick={() => copyMessage(message.content)}
                        className="ml-2 hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3 w-3 inline" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          </FoundationRepairGate>
        </div>
      </div>

      {/* Input */}
      {phase4Enabled && (
        <div className="border-t bg-card">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  data-testid="copilot-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about energy data across multiple sources..."
                  className="w-full min-h-[60px] max-h-[120px] p-3 pr-10 rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                  maxLength={500}
                  disabled={isLoading}
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {input.length}/500
                </div>
              </div>
              <button
                data-testid="copilot-send"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="text-muted-foreground py-1">Quick prompts:</span>
              <button
                onClick={() => loadExample('Compare AB and ON prices')}
                className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Zap className="h-3 w-3 inline mr-1" />
                Compare prices
              </button>
              <button
                onClick={() => loadExample('Show grid status + emissions')}
                className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <BarChart3 className="h-3 w-3 inline mr-1" />
                Grid + emissions
              </button>
              <button
                onClick={() => loadExample('Find arbitrage opportunities')}
                className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Opportunities
              </button>
              <button
                onClick={() => loadExample('Storage dispatch status')}
                className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Leaf className="h-3 w-3 inline mr-1" />
                Storage status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
