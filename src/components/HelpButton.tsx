// src/components/HelpButton.tsx
// Accessible help button with tooltip and modal integration
// Shows quick tooltip from manifest, opens detailed modal on click

import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { HelpContent } from '../lib/helpApi';
import { useHelpText } from './HelpProvider';

interface HelpButtonProps {
  id: string;
  className?: string;
}

export function HelpButton({ id, className = '' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [sanitizedHtml, setSanitizedHtml] = useState<string>('');
  const [HelpModalComponent, setHelpModalComponent] = useState<React.ComponentType<any> | null>(null);
  
  // Get tooltip text from the help context
  const shortText = useHelpText(id);

  useEffect(() => {
    if (!open) return;

    if (!HelpModalComponent) {
      import('./HelpModal')
        .then((module) => {
          setHelpModalComponent(() => module.HelpModal);
        })
        .catch((error) => {
          console.error('Failed to load help modal:', error);
        });
    }
  }, [HelpModalComponent, open]);

  useEffect(() => {
    if (!open || !content?.body_html) {
      setSanitizedHtml('');
      return;
    }

    let cancelled = false;
    import('dompurify')
      .then(({ default: DOMPurify }) => {
        if (!cancelled) {
          setSanitizedHtml(DOMPurify.sanitize(content.body_html));
        }
      })
      .catch((error) => {
        console.error('Failed to sanitize help content:', error);
        if (!cancelled) {
          setSanitizedHtml(content.body_html);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content?.body_html, open]);

  // Handle button click - use local content database first, then try API
  const handleClick = async () => {
    setOpen(true);

    // Only fetch if we don't have content or it's for a different ID
    if (!content || content.id !== id) {
      setLoading(true);
      try {
        const [{ getHelpContent }, { fetchHelpById }] = await Promise.all([
          import('../lib/helpContent'),
          import('../lib/helpApi'),
        ]);

        // First, check local help content database (instant, no network)
        const localContent = getHelpContent(id);
        
        // Convert to HelpContent format
        setContent({
          id: localContent.id,
          short_text: localContent.shortText,
          body_html: localContent.bodyHtml,
          related_sources: localContent.relatedTopics?.map(topic => ({
            name: topic,
            url: `#help-${topic}`
          }))
        });
        
        // Optionally try to fetch from API to get latest content (non-blocking)
        // This allows server-side updates without redeploying
        fetchHelpById(id).then(apiContent => {
          if (apiContent) {
            setContent(apiContent);
          }
        }).catch(() => {
          // Silently fail - we already have local content
        });
        
      } catch (error) {
        console.error('Failed to load help content:', error);
        // Fallback to generic message
        setContent({
          id,
          short_text: shortText || 'Help',
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

      {open && HelpModalComponent && (
        <HelpModalComponent
          isOpen={open}
          onClose={() => setOpen(false)}
          title={content?.short_text || 'Help'}
          content={sanitizedHtml ? <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} /> : null}
        />
      )}
    </>
  );
}
