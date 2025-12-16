/**
 * QuizApp - Lightweight Entry Point for Whop
 * 
 * Completely minimal layout that bypasses the main App's heavy providers.
 * Ensures fast load times and no auth/API errors for guest users (Whop reviewers).
 */

import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Zap, Shield } from 'lucide-react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ThemeToggle } from '../ui/ThemeToggle';

export function QuizApp() {
    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-cyan-500/30">
                {/* Minimal Header - No Auth Logic */}
                <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <Link to="/whop/quiz" className="flex items-center gap-2 group">
                            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg leading-tight">Energy Quiz Pro</h1>
                                <p className="text-xs text-slate-400">Powered by Canada Energy Academy</p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-3">
                            <ThemeToggle compact />
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                <span>Client-Side Secure</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="max-w-4xl mx-auto p-6">
                    <Outlet />
                </main>

                {/* Simple Footer */}
                <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Canada Energy Intelligence Platform.</p>
                    <p className="mt-1">Relocating to Alberta? <Link to="/hire-me" className="text-cyan-500 hover:text-cyan-400">Hire the developer.</Link></p>
                </footer>
            </div>
        </ErrorBoundary>
    );
}

export default QuizApp;
