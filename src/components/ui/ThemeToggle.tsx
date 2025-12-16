/**
 * ThemeToggle - Light/Dark Mode Toggle Button
 * 
 * Simple toggle button for switching between light and dark themes.
 */

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';

interface ThemeToggleProps {
    compact?: boolean;
    className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
    const { theme, toggleTheme } = useTheme();

    const isLight = theme === 'light';

    if (compact) {
        return (
            <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${isLight
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    } ${className}`}
                aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
                {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
        );
    }

    return (
        <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isLight
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                } ${className}`}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            {isLight ? (
                <>
                    <Moon className="h-4 w-4" />
                    <span className="text-sm font-medium">Dark</span>
                </>
            ) : (
                <>
                    <Sun className="h-4 w-4" />
                    <span className="text-sm font-medium">Light</span>
                </>
            )}
        </button>
    );
}

export default ThemeToggle;
