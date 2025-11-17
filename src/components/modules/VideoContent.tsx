import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle } from 'lucide-react';
import { VideoContent as VideoContentType } from '../../lib/moduleContent';

interface VideoContentProps {
  content: VideoContentType;
  onComplete?: () => void;
  isCompleted: boolean;
}

export function VideoContent({ content, onComplete, isCompleted }: VideoContentProps) {
  const [hasWatchedMost, setHasWatchedMost] = useState(false);
  const [timeWatched, setTimeWatched] = useState(0);

  // Extract YouTube video ID from URL
  const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeId(content.url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`
    : content.url;

  // Track video watch progress
  useEffect(() => {
    // Simple time-based tracking
    const interval = setInterval(() => {
      setTimeWatched(prev => {
        const newTime = prev + 1;
        // Mark as "mostly watched" after 80% of video duration
        if (newTime >= content.duration * 0.8 && !hasWatchedMost) {
          setHasWatchedMost(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [content.duration, hasWatchedMost]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const watchPercentage = Math.min((timeWatched / content.duration) * 100, 100);

  return (
    <div className="h-full flex flex-col">
      {/* Video header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-400">
              Duration: {formatTime(content.duration)}
            </div>
            <div className="text-sm text-slate-400">
              Watched: {Math.round(watchPercentage)}%
            </div>
          </div>

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-3 relative w-full h-2 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${watchPercentage}%` }}
          />
        </div>
      </div>

      {/* Video player */}
      <div className="flex-1 bg-black flex items-center justify-center">
        <div className="w-full h-full">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Module video"
          />
        </div>
      </div>

      {/* Transcript section (optional) */}
      {content.transcript && (
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-2">Transcript</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {content.transcript}
          </p>
        </div>
      )}

      {/* Complete button */}
      {!isCompleted && hasWatchedMost && (
        <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              You've watched most of the video. Ready to continue?
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
