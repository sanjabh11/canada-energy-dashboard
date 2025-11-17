import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Clock, CheckCircle } from 'lucide-react';
import { ReadingContent as ReadingContentType } from '../../lib/moduleContent';

interface ReadingContentProps {
  content: ReadingContentType;
  onComplete?: () => void;
  isCompleted: boolean;
}

export function ReadingContent({ content, onComplete, isCompleted }: ReadingContentProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    // Track time spent
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const bottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (bottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Reading header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                {content.estimatedReadTime} min read
              </span>
            </div>
            <div className="text-sm text-slate-400">
              Time spent: {formatTime(timeSpent)}
            </div>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Reading content */}
      <div
        className="flex-1 overflow-y-auto px-6 py-8"
        onScroll={handleScroll}
      >
        <div className="max-w-4xl mx-auto prose prose-invert prose-slate prose-headings:text-white prose-p:text-slate-300 prose-a:text-cyan-400 prose-strong:text-white prose-code:text-cyan-300 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded">
          <ReactMarkdown>{content.content}</ReactMarkdown>
        </div>
      </div>

      {/* Complete button */}
      {!isCompleted && hasScrolledToBottom && (
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              You've reached the end of this reading.
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Mark as Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
