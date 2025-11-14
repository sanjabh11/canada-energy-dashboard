import React, { useRef, useState, useEffect } from 'react';
import { CONTAINER_CLASSES } from '../lib/ui/layout';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

export interface RibbonTab {
  id: string;
  label: string;
  // lucide icon component
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  // Optional badge text (e.g., "Limited", "Soon")
  badge?: string | null;
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
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollByAmount = (dx: number) => {
    const el = ribbonRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: 'smooth' });
  };

  // Show first 12 tabs as core on desktop (optimized for monetization)
  // On mobile/tablet, show fewer tabs for better UX
  const coreTabCount = isMobile ? 6 : 12;
  const coreTabs = tabs.slice(0, coreTabCount);
  const moreTabs = tabs.slice(coreTabCount);

  // Update dropdown position when it opens
  useEffect(() => {
    if (showMoreDropdown && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
  }, [showMoreDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !moreButtonRef.current?.contains(event.target as Node)) {
        setShowMoreDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreDropdown]);

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
        {coreTabs.map((tab) => {
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
              {tab.badge && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${
                  tab.badge === 'Limited'
                    ? 'bg-yellow-100 text-yellow-700'
                    : tab.badge === 'Soon'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* More dropdown */}
        {moreTabs.length > 0 && (
          <>
            <button
              ref={moreButtonRef}
              onClick={() => setShowMoreDropdown(!showMoreDropdown)}
              className={`ribbon-item ${moreTabs.some(tab => tab.id === activeTab) ? 'ribbon-item-active' : ''}`}
            >
              <MoreHorizontal className="h-4 w-4 mr-2" />
              <span>More</span>
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} />
            </button>
          </>
        )}
      </div>

      {/* Dropdown rendered outside ribbon container to avoid overflow clipping */}
      {showMoreDropdown && moreTabs.length > 0 && (
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[9999] min-w-[220px] max-w-[280px] max-h-[calc(100vh-100px)] overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`
          }}
        >
          {moreTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelect(tab.id);
                  setShowMoreDropdown(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center transition-colors border-b border-slate-100 last:border-b-0 ${
                  isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                }`}
              >
                {Icon ? <Icon className="h-4 w-4 mr-3 flex-shrink-0" /> : null}
                <span className="flex-1">{tab.label}</span>
                {tab.badge && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${
                    tab.badge === 'Limited'
                      ? 'bg-yellow-100 text-yellow-700'
                      : tab.badge === 'Soon'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
