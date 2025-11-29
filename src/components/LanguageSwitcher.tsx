/**
 * LanguageSwitcher Component
 * 
 * Toggle between English and French for bilingual support.
 * Addresses Gap #3: Bilingual EN/FR (HIGH Priority)
 * 
 * Usage:
 * <LanguageSwitcher />
 * <LanguageSwitcher variant="dropdown" />
 */

import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation, Language } from '../lib/i18n';

interface LanguageSwitcherProps {
  /** Display variant */
  variant?: 'toggle' | 'dropdown' | 'buttons';
  /** Show language names vs codes */
  showLabel?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' }
];

export function LanguageSwitcher({
  variant = 'toggle',
  showLabel = true,
  compact = false,
  className = ''
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  // Toggle variant - simple EN/FR switch
  if (variant === 'toggle') {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        {!compact && <Globe className="h-4 w-4 text-slate-400" />}
        <div className="flex rounded-lg border border-slate-600 overflow-hidden">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                language === lang.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
              aria-label={`Switch to ${lang.name}`}
              aria-pressed={language === lang.code}
            >
              {lang.code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Buttons variant - separate buttons
  if (variant === 'buttons') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {!compact && <Globe className="h-4 w-4 text-slate-400" />}
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              language === lang.code
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
            aria-label={`Switch to ${lang.name}`}
            aria-pressed={language === lang.code}
          >
            {showLabel ? lang.nativeName : lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4" />
        {showLabel ? currentLang.nativeName : currentLang.code.toUpperCase()}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />

          {/* Dropdown menu */}
          <div
            className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
            role="listbox"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setDropdownOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  language === lang.code
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
                role="option"
                aria-selected={language === lang.code}
              >
                <div className="flex items-center justify-between">
                  <span>{lang.nativeName}</span>
                  <span className="text-xs text-slate-500">
                    {lang.code.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LanguageSwitcher;
