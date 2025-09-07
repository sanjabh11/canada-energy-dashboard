import React, { useRef } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';

export interface RibbonTab {
  id: string;
  label: string;
  // lucide icon component
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface NavigationRibbonProps {
  tabs: RibbonTab[];
  activeTab: string;
  onSelect: (id: string) => void;
  className?: string;
}

/**
 * Horizontal, scrollable, snap-aligned navigation ribbon.
 * Prevents vertical overflow by keeping items on a single row with horizontal scroll.
 */
export const NavigationRibbon: React.FC<NavigationRibbonProps> = ({ tabs, activeTab, onSelect, className }) => {
  const ribbonRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (dx: number) => {
    const el = ribbonRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return (
    <div className={`ribbon-wrapper ${className ?? ''}`}>
      {/* Left control (hidden on small screens) */}
      <button
        type="button"
        aria-label="Scroll left"
        className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow rounded-full p-2 border border-slate-200"
        onClick={() => scrollByAmount(-240)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div ref={ribbonRef} className="ribbon" role="tablist" aria-label="Main Navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.id)}
              className={`ribbon-item ${isActive ? 'ribbon-item-active' : ''}`}
            >
              {Icon ? <Icon className="h-4 w-4 mr-2" /> : null}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right control (hidden on small screens) */}
      <button
        type="button"
        aria-label="Scroll right"
        className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white shadow rounded-full p-2 border border-slate-200"
        onClick={() => scrollByAmount(240)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default NavigationRibbon;
