/**
 * SkipToMain Component
 * 
 * Accessibility skip navigation link for keyboard users.
 * Addresses Gap #4: Accessibility WCAG 2.2 AA (HIGH Priority)
 * 
 * Usage:
 * Place at the very top of your App component:
 * <SkipToMain targetId="main-content" />
 * 
 * Then add id="main-content" to your main content area.
 */

import React from 'react';
import { useTranslation } from '../../lib/i18n';

interface SkipToMainProps {
  /** ID of the main content element to skip to */
  targetId?: string;
  /** Custom label (overrides i18n) */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipToMain({
  targetId = 'main-content',
  label,
  className = ''
}: SkipToMainProps) {
  const { t } = useTranslation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        fixed top-2 left-2 z-[9999]
        px-4 py-2 
        bg-blue-600 text-white 
        rounded-lg shadow-lg
        font-medium text-sm
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900
        transition-all
        ${className}
      `}
    >
      {label || t.a11y.skipToMain}
    </a>
  );
}

/**
 * SkipLinks - Multiple skip navigation links
 */
interface SkipLink {
  targetId: string;
  label: string;
}

interface SkipLinksProps {
  links: SkipLink[];
  className?: string;
}

export function SkipLinks({ links, className = '' }: SkipLinksProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`sr-only focus-within:not-sr-only fixed top-2 left-2 z-[9999] ${className}`}
      aria-label="Skip navigation"
    >
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.targetId}>
            <a
              href={`#${link.targetId}`}
              onClick={(e) => handleClick(e, link.targetId)}
              className="
                block px-4 py-2 
                bg-blue-600 text-white 
                rounded-lg shadow-lg
                font-medium text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900
                hover:bg-blue-700
                transition-all
              "
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default SkipToMain;
