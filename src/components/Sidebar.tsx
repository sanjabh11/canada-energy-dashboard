import React, { useState } from 'react';
import { CONTAINER_CLASSES, TEXT_CLASSES, COLOR_SCHEMES, RESPONSIVE_UTILS } from '../lib/ui/layout';

export interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Collapsible left sidebar for filters, legends, and contextual information.
 * Prevents content compression by being overlay/off-canvas on mobile.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  title = 'Filters',
  children
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static top-0 left-0 h-full w-80 bg-white border-r border-slate-200 shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isOpen ? 'md:w-80' : 'md:w-16'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h3 className={`font-semibold text-slate-800 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'
          }`}>
            {isOpen && title}
          </h3>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <svg
              className={`w-5 h-5 text-slate-600 transform transition-transform duration-300 ${
                isOpen ? '' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'
        }`}>
          {isOpen && children}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
