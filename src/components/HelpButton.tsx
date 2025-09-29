// src/components/HelpButton.tsx
// Accessible help button with tooltip and modal integration
// Shows quick tooltip from manifest, opens detailed modal on click

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { fetchHelpById, type HelpContent } from '../lib/helpApi';
import { HelpModal } from './HelpModal';
import { useHelpText } from './HelpProvider';

interface HelpButtonProps {
  id: string;
  className?: string;
}

export function HelpButton({ id, className = '' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Get tooltip text from the help context
  const shortText = useHelpText(id);

  // Handle button click - fetch content if not already loaded
  const handleClick = async () => {
    setOpen(true);

    // Only fetch if we don't have content or it's for a different ID
    if (!content || content.id !== id) {
      setLoading(true);
      try {
        const fetchedContent = await fetchHelpById(id);
        setContent(fetchedContent);
      } catch (error) {
        console.error('Failed to load help content:', error);
        // Set default error content
        setContent({
          id,
          short_text: shortText,
          body_html: '<p>Unable to load help content. Please try again or contact support.</p>'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Basic analytics tracking (can be enhanced later)
  const trackHelpOpen = (action: 'tooltip_hover' | 'button_click') => {
    // Simple console logging for now - can be enhanced with actual analytics
    console.debug(`Help ${action} for ${id}`, {
      timestamp: Date.now(),
      action: action,
      id: id
    });

    // TODO: Integrate with actual analytics service
    // Example: window.gtag('event', 'help_interaction', { action, id });
  };

  return (
    <>
      <button
        onClick={() => {
          trackHelpOpen('button_click');
          handleClick();
        }}
        onMouseEnter={() => trackHelpOpen('tooltip_hover')}
        aria-label={`Help: ${shortText}`}
        title={shortText}
        className={`
          inline-flex items-center justify-center
          w-8 h-8 rounded-md
          bg-slate-700 hover:bg-slate-600
          border border-slate-600 hover:border-cyan-500
          transition-all duration-200
          text-cyan-400 hover:text-cyan-300
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${className}
        `}
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <HelpModal
          id={id}
          open={open}
          onClose={() => setOpen(false)}
          content={content}
          loading={loading}
        />
      )}
    </>
  );
}
