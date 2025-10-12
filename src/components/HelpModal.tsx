// src/components/HelpModal.tsx
// Accessible modal component for displaying detailed educational help content
// Includes focus trap, keyboard navigation, and dark theming

import React, { useEffect, useRef } from 'react';
import { X, HelpCircle, Info, Database, TrendingUp, AlertTriangle } from 'lucide-react';

interface HelpSection {
  title: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content?: React.ReactNode;
  sections?: HelpSection[];
  provenance?: {
    label: string;
    description: string;
  }[];
  methodology?: string;
  limitations?: string[];
}

export const HelpModal: React.FC<HelpModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  content,
  sections,
  provenance,
  methodology,
  limitations
}) => {
  if (!isOpen) return null;

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
          {/* Main content area */}
          <div
            id="help-modal-content"
            className="prose prose-slate prose-invert max-w-none"
          >
            {content ? (
              <div className="text-slate-200 space-y-4">
                {content}
              </div>
            ) : (
              <div className="text-slate-400 text-center py-8">
                Help content not available.
              </div>
            )}
          </div>

          {/* Sections */}
          {sections && sections.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700 space-y-4">
              {sections.map((section, index) => (
                <div key={index}>
                  <div className="flex items-center gap-2 mb-2">
                    {section.icon}
                    <h3 className="text-sm font-medium text-slate-200">{section.title}</h3>
                  </div>
                  <div className="text-slate-300 text-sm">{section.content}</div>
                </div>
              ))}
            </div>
          )}

          {/* Provenance section */}
          {provenance && provenance.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-medium text-slate-200 mb-2">Data Sources:</h3>
              <ul className="space-y-1">
                {provenance.map((item, index) => (
                  <li key={index} className="text-slate-300 text-sm">
                    <strong>{item.label}:</strong> {item.description}
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