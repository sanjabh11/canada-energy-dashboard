// src/components/HelpModal.tsx
// Accessible modal component for displaying detailed educational help content
// Includes focus trap, keyboard navigation, and dark theming

import React, { useEffect, useRef } from 'react';

interface HelpContent {
  id: string;
  short_text?: string;
  body_html?: string;
  related_sources?: Array<{name: string; url: string}>;
  last_updated?: string;
}

interface HelpModalProps {
  id: string;
  open: boolean;
  onClose: () => void;
  content?: HelpContent | null;
  loading?: boolean;
}

export function HelpModal({
  id,
  open,
  onClose,
  content,
  loading = false
}: HelpModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Handle Escape key and focus management
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKey);
      // Focus the close button after a short delay for proper modal behavior
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }

    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Basic focus trap
  useEffect(() => {
    if (!open) return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  // Don't render if modal is not open
  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden="true"
    >
      {/* Modal backdrop with dismiss on click */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        aria-describedby="help-modal-content"
        className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto focus:outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2
            id="help-modal-title"
            className="text-xl font-semibold text-slate-200"
          >
            Help
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close help"
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Short text as subtitle if available */}
          {content?.short_text && (
            <div className="mb-4 text-slate-300 text-sm leading-relaxed">
              {content.short_text}
            </div>
          )}

          {/* Main content area */}
          <div
            id="help-modal-content"
            className="prose prose-slate prose-invert max-w-none"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center space-x-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading help content...</span>
                </div>
              </div>
            ) : content?.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: content.body_html }}
                className="text-slate-200 space-y-4"
              />
            ) : (
              <div className="text-slate-400 text-center py-8">
                Help content not available.
              </div>
            )}
          </div>

          {/* Related sources section */}
          {content?.related_sources && content.related_sources.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-200 mb-2">More Information:</h3>
              <ul className="space-y-1">
                {content.related_sources.map((source, index) => (
                  <li key={index}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
                    >
                      {source.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center space-x-3 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}